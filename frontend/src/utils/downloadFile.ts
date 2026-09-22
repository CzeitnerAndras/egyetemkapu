export async function downloadAuthenticatedFile(url: string, fileName: string): Promise<boolean> {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        return false;
    }

    const blob = await res.blob();
    if (blob.size === 0) {
        return false;
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(objectUrl);
    return true;
}
