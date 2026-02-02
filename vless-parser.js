/**
 * VLESS Protocol Parser
 * 
 * VLESS Header Structure:
 * +------+------+--------+----------+------+------+---------+----------+
 * | Ver  | UUID | OptLen | Opt Data | CMD  | Port | AddrType| Address  |
 * +------+------+--------+----------+------+------+---------+----------+
 * | 1B   | 16B  | 1B     | Variable | 1B   | 2B   | 1B      | Variable |
 * +------+------+--------+----------+------+------+---------+----------+
 * 
 * Address Types:
 * - 0x01: IPv4 (4 bytes)
 * - 0x02: Domain (1 byte length + domain string)
 * - 0x03: IPv6 (16 bytes)
 * 
 * Commands:
 * - 0x01: TCP
 * - 0x02: UDP
 */

/**
 * Convert 16 bytes to UUID string format
 * @param {Uint8Array} bytes - 16-byte array
 * @returns {string} UUID in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export function bytesToUUID(bytes) {
  if (bytes.length !== 16) {
    throw new Error('UUID must be exactly 16 bytes');
  }

  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Insert dashes at positions: 8, 12, 16, 20
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

/**
 * Validate VLESS command
 * @param {number} command - Command byte
 * @returns {boolean} True if command is valid (TCP only for now)
 */
export function validateCommand(command) {
  // Only support TCP (0x01) for now
  // UDP (0x02) could be added later
  return command === 1;
}

/**
 * Process VLESS protocol header and extract connection details
 * @param {Uint8Array} buffer - Raw buffer containing VLESS header
 * @param {string} expectedUUID - Expected UUID for authentication
 * @returns {Object} Parsed header information
 */
export function processVlessHeader(buffer, expectedUUID) {
  // Minimum header size: 1(ver) + 16(uuid) + 1(optLen) + 1(cmd) + 2(port) + 1(addrType) + 1(addr min)
  if (buffer.length < 23) {
    return {
      hasError: true,
      message: 'Invalid VLESS header: buffer too short'
    };
  }

  let offset = 0;

  // ===== Parse Version (1 byte) =====
  const version = buffer[offset++];
  if (version !== 0) {
    return {
      hasError: true,
      message: `Unsupported VLESS version: ${version}. Only version 0 is supported.`
    };
  }

  // ===== Parse UUID (16 bytes) =====
  const uuidBytes = buffer.slice(offset, offset + 16);
  offset += 16;

  const clientUUID = bytesToUUID(uuidBytes);
  
  // Validate UUID
  if (clientUUID !== expectedUUID) {
    return {
      hasError: true,
      message: 'Authentication failed: Invalid UUID'
    };
  }

  // ===== Parse Additional Options Length (1 byte) =====
  const optLen = buffer[offset++];

  // ===== Skip Additional Options (variable length) =====
  if (buffer.length < offset + optLen) {
    return {
      hasError: true,
      message: 'Invalid VLESS header: incomplete options data'
    };
  }
  offset += optLen; // Skip the additional options data

  // ===== Parse Command (1 byte) =====
  if (buffer.length < offset + 1) {
    return {
      hasError: true,
      message: 'Invalid VLESS header: missing command'
    };
  }
  
  const command = buffer[offset++];
  
  if (!validateCommand(command)) {
    return {
      hasError: true,
      message: `Unsupported command: ${command}. Only TCP (0x01) is supported.`
    };
  }

  // ===== Parse Port (2 bytes, big-endian) =====
  if (buffer.length < offset + 2) {
    return {
      hasError: true,
      message: 'Invalid VLESS header: missing port'
    };
  }
  
  const portRemote = (buffer[offset] << 8) | buffer[offset + 1];
  offset += 2;

  // ===== Parse Address Type (1 byte) =====
  if (buffer.length < offset + 1) {
    return {
      hasError: true,
      message: 'Invalid VLESS header: missing address type'
    };
  }
  
  const addressType = buffer[offset++];
  let addressRemote = '';

  // ===== Parse Address (variable length based on type) =====
  switch (addressType) {
    case 1: // IPv4 (4 bytes)
      if (buffer.length < offset + 4) {
        return {
          hasError: true,
          message: 'Invalid VLESS header: incomplete IPv4 address'
        };
      }
      addressRemote = `${buffer[offset]}.${buffer[offset + 1]}.${buffer[offset + 2]}.${buffer[offset + 3]}`;
      offset += 4;
      break;

    case 2: // Domain (1 byte length + domain string)
      if (buffer.length < offset + 1) {
        return {
          hasError: true,
          message: 'Invalid VLESS header: missing domain length'
        };
      }
      
      const domainLength = buffer[offset++];
      
      if (buffer.length < offset + domainLength) {
        return {
          hasError: true,
          message: 'Invalid VLESS header: incomplete domain name'
        };
      }
      
      addressRemote = new TextDecoder().decode(buffer.slice(offset, offset + domainLength));
      offset += domainLength;
      break;

    case 3: // IPv6 (16 bytes)
      if (buffer.length < offset + 16) {
        return {
          hasError: true,
          message: 'Invalid VLESS header: incomplete IPv6 address'
        };
      }
      
      // Convert 16 bytes to IPv6 format (8 groups of 2 bytes in hex)
      const ipv6Parts = [];
      for (let i = 0; i < 16; i += 2) {
        const hexPart = ((buffer[offset + i] << 8) | buffer[offset + i + 1]).toString(16);
        ipv6Parts.push(hexPart);
      }
      addressRemote = ipv6Parts.join(':');
      offset += 16;
      break;

    default:
      return {
        hasError: true,
        message: `Unsupported address type: ${addressType}`
      };
  }

  // ===== Success: Return parsed data =====
  return {
    hasError: false,
    addressRemote,
    portRemote,
    rawDataIndex: offset, // Index where the actual payload data starts
    vlessVersion: version,
    command,
    addressType,
    message: 'VLESS header parsed successfully'
  };
}

export default {
  processVlessHeader,
  bytesToUUID,
  validateCommand
};
