/**
 * Fake nginx welcome page to disguise the proxy server
 */

export function getNginxWelcomePage() {
  return `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
    h1 {
        font-size: 1.8em;
        margin-top: 1em;
    }
    p {
        line-height: 1.6;
        margin: 1em 0;
    }
    a {
        color: #0066cc;
        text-decoration: none;
    }
    a:hover {
        text-decoration: underline;
    }
    .footer {
        margin-top: 2em;
        font-size: 0.9em;
        color: #666;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p class="footer"><em>Thank you for using nginx.</em></p>
</body>
</html>`;
}

export default getNginxWelcomePage;
