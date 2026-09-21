


// === PAYLAŞIM SEKMESİ ===
// Ders adı, ziyaretçilerin "Dersim listede yok" alanına serbestçe yazdığı bir metin — admin
// onayladıktan sonra bu dersi seçen HERKESİN tarayıcısında görüntüleniyor. Bu yüzden ekrana
// yazılırken mutlaka kaçışlı (escaped) olmalı, yoksa ders adı bir XSS vektörüne dönüşür.
function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
}
export { escHtml };
