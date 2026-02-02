export function processVlessHeader(vlessBuffer, userID) {
  if (vlessBuffer.byteLength < 24) {
    return { hasError: true, message: 'Buffer too short' };
  }
  
  // VLESS version (must be 0)
  const version = vlessBuffer[0];
  if (version !== 0) {
    return { hasError: true, message: 'Invalid version' };
  }
  
  // Extract and validate UUID (16 bytes)
  const uuid = bytesToUUID(vlessBuffer.slice(1, 17));
  if (uuid !== userID) {
    return { hasError: true, message: 'Invalid UUID' };
  }
  
  // Additional options length
  const optLength = vlessBuffer[17];
  
  // Command: 1=TCP, 2=UDP
  const command = vlessBuffer[18 + optLength];
  if (command !== 1) {
    return { hasError: true, message: 'Only TCP supported' };
  }
  
  // Port (2 bytes, big-endian)
  const portIndex = 18 + optLength + 1;
  const portRemote = (vlessBuffer[portIndex] << 8) | vlessBuffer[portIndex + 1];
  
  // Address type and parsing
  const addressIndex = portIndex + 2;
  const addressType = vlessBuffer[addressIndex];
  let addressLength = 0;
  let addressRemote = '';
  
  switch (addressType) {
    case 1: // IPv4 (4 bytes)
      addressLength = 4;
      addressRemote = Array.from(
        vlessBuffer.slice(addressIndex + 1, addressIndex + 1 + addressLength)
      ).join('.');
      break;
      
    case 2: // Domain name
      addressLength = vlessBuffer[addressIndex + 1];
      addressRemote = new TextDecoder().decode(
        vlessBuffer.slice(addressIndex + 2, addressIndex + 2 + addressLength)
      );
      addressLength += 1; // Include length byte
      break;
      
    case 3: // IPv6 (16 bytes)
      addressLength = 16;
      const ipv6Parts = [];
      for (let i = 0; i < 16; i += 2) {
        const part = (vlessBuffer[addressIndex + 1 + i] << 8) | 
                     vlessBuffer[addressIndex + 2 + i];
        ipv6Parts.push(part.toString(16));
      }
      addressRemote = ipv6Parts.join(':');
      break;
      
    default:
      return { hasError: true, message: 'Unknown address type' };
  }
  
  // Calculate where payload data starts
  const rawDataIndex = addressIndex + 1 + addressLength;
  
  return {
    hasError: false,
    addressRemote,
    portRemote,
    rawDataIndex,
    command
  };
}

export function bytesToUUID(bytes) {
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
