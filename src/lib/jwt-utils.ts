
export function parseJwt(token: string) {
    try {
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    } catch (e) {
        return null;
    }
}

export function isTokenExpired(token: string): boolean {
    const decoded = parseJwt(token);
    if (!decoded || !decoded.exp) {
        return true;
    }
    // exp is in seconds, Date.now() is in milliseconds
    return Date.now() >= decoded.exp * 1000;
}
