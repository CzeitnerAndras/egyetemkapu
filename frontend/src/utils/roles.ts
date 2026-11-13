export function isAdminRole(role: unknown): boolean {
    return role === 'ROLE_ADMIN' || role === 'ADMIN';
}
