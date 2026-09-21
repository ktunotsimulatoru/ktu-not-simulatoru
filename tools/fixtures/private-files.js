(() => {
    let session = { access_token: 'local-fixture-token', user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@ogr.ktu.edu.tr' } };
    let authChange;
    const query = new Proxy({}, { get: (_, key) => key === 'then' ? resolve => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve) : () => query });
    window.supabase = { createClient: () => ({ from: () => query, rpc: () => query,
        auth: { getSession: async () => ({ data: { session } }), onAuthStateChange: cb => {
            authChange = cb; queueMicrotask(() => cb('INITIAL_SESSION', session)); return { data: {} };
        }, signOut: async () => { session = null; await authChange('SIGNED_OUT', null); } } }) };
    const paths = ['22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'].map(id =>
        'https://not-kutusu.elements0.workers.dev/11111111-1111-4111-8111-111111111111/' + id + '.png');
    window.fetch = async (url, options) => {
        if (!paths.includes(url)) throw new Error('Fixture dışında ağ isteği engellendi');
        const allowed = session && options.headers.Authorization === 'Bearer local-fixture-token';
        document.getElementById('fixture-log').textContent += url.split('/').pop() + ': ' + (allowed ? 'kimlik başlığı var' : 'reddedildi') + '\n';
        return allowed ? new Response(Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS8sAAAAASUVORK5CYII='), c => c.charCodeAt(0)), {headers:{'Content-Type':'image/png'}}) : new Response('', {status:401});
    };
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('fixture-gallery').addEventListener('click', () => { hsGaleriKaydet('fixture',paths); hsElementAc('fixture',0); });
        document.getElementById('fixture-logout').addEventListener('click', async () => { await getSupabase().auth.signOut(); document.getElementById('fixture-status').textContent='Test oturumu kapalı'; });
    });
})();
