export const FLYER_HOST = 'akcio.egyetemkapu.hu';
export const FLYER_ORIGIN = `https://${FLYER_HOST}`;

export function isFlyerHost(hostname = window.location.hostname) {
    return hostname === FLYER_HOST;
}

export function isStudentProductionHost(hostname = window.location.hostname) {
    return hostname === 'egyetemkapu.hu' || hostname === 'www.egyetemkapu.hu';
}
