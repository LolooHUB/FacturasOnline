emailjs.init("ne2_1nbxGq2hC0ju1");
let db;
try { db = firebase.firestore(); } catch(e) {}

function addItem(valDesc = '', valCant = 1, valPrec = '') {
    const container = document.getElementById('items-container');
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
        <input type="text" placeholder="Producto" class="i-desc" value="${valDesc}" oninput="upd()">
        <input type="number" placeholder="Cant" class="i-cant" value="${valCant}" oninput="upd()">
        <input type="number" placeholder="Precio" class="i-precio" value="${valPrec}" oninput="upd()">
        <button onclick="this.parentElement.remove(); upd()" class="btn-delete">✕</button>
    `;
    container.appendChild(div);
    upd();
}

function upd() {
    const fields = ['eNom', 'eCuit', 'cNom', 'ePago', 'tipoF', 'fecManual', 'email', 'tel'];
    const d = {};
    fields.forEach(f => d[f] = document.getElementById(f).value);

    document.getElementById('p-eNom').innerText = d.eNom || "MI EMPRESA";
    document.getElementById('p-eCuit').innerText = d.eCuit || "...";
    document.getElementById('p-cNom').innerText = d.cNom || "...";
    document.getElementById('p-letra').innerText = d.tipoF;
    document.getElementById('p-fec').innerText = d.fecManual;
    document.getElementById('p-pago').innerText = d.ePago || "...";

    let total = 0; let htmlItems = "";
    document.querySelectorAll('.item-row').forEach(row => {
        const desc = row.querySelector('.i-desc').value;
        const cant = parseFloat(row.querySelector('.i-cant').value) || 0;
        const prec = parseFloat(row.querySelector('.i-precio').value) || 0;
        const sub = cant * prec;
        total += sub;
        if(desc) htmlItems += `<tr><td>${cant}</td><td>${desc}</td><td>$${prec.toLocaleString()}</td><td style="text-align:right">$${sub.toLocaleString()}</td></tr>`;
    });
    document.getElementById('p-items').innerHTML = htmlItems;
    document.getElementById('p-tot').innerText = "$ " + total.toLocaleString();
    localStorage.setItem('config_padre', JSON.stringify({eNom: d.eNom, eCuit: d.eCuit, ePago: d.ePago}));
}

function capturarURL() {
    const p = new URLSearchParams(window.location.search);
    const set = (id, param) => { if(p.has(param)) document.getElementById(id).value = decodeURIComponent(p.get(param)); };
    
    ['eNom', 'eCuit', 'ePago', 'cNom', 'tel', 'email', 'tipoF'].forEach(f => set(f, f));
    
    if (p.has('articulo1') || p.has('monto1')) {
        document.getElementById('items-container').innerHTML = '';
        let i = 1;
        while(p.has(`articulo${i}`) || p.has(`monto${i}`)) {
            addItem(p.get(`articulo${i}`), p.get(`cant${i}`) || 1, p.get(`monto${i}`));
            i++;
        }
    } else { addItem(); }
}

async function enviar(canal) {
    upd();
    const cliente = document.getElementById('cNom').value;
    const total = document.getElementById('p-tot').innerText;
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.text(`FACTURA ${document.getElementById('tipoF').value}`, 105, 20, {align:'center'});
    pdf.text(`Emisor: ${document.getElementById('eNom').value}`, 20, 40);
    pdf.text(`Cliente: ${cliente}`, 20, 50);
    pdf.text(`TOTAL: ${total}`, 20, 80);
    pdf.save(`Factura_${cliente}.pdf`);

    if(canal === 'wa') {
        let msg = `📄 *FACTURA DIGITAL*%0A━━━━━━━━━━━━━━━━%0A👤 *Cliente:* ${cliente}%0A💰 *TOTAL: ${total}*%0A━━━━━━━━━━━━━━━━%0A💳 *Pago:* ${document.getElementById('ePago').value}`;
        window.open(`https://api.whatsapp.com/send?phone=${document.getElementById('tel').value}&text=${msg}`);
    } else {
        alert("Enviando mail...");
        emailjs.send("service_t5t4wor", "template_vyjg8af", { to_email: document.getElementById('email').value, to_name: cliente, total_monto: total });
    }
}

async function copiarImagen() {
    const canvas = await html2canvas(document.getElementById('preview-box'), {scale:2});
    canvas.toBlob(blob => navigator.clipboard.write([new ClipboardItem({"image/png": blob})]));
    alert("Copiado!");
}

window.onload = () => {
    const c = JSON.parse(localStorage.getItem('config_padre'));
    if(c) { Object.keys(c).forEach(k => document.getElementById(k).value = c[k]); }
    document.getElementById('fecManual').value = new Date().toLocaleDateString();
    capturarURL();
    upd();
};
