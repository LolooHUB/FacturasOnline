emailjs.init("ne2_1nbxGq2hC0ju1");

function addItem(vDesc='', vCant=1, vPrec='') {
    const container = document.getElementById('items-container');
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `<input type="text" placeholder="Producto" class="i-desc" value="${vDesc}" oninput="upd()"><input type="number" placeholder="Cant" class="i-cant" value="${vCant}" oninput="upd()"><input type="number" placeholder="Precio" class="i-precio" value="${vPrec}" oninput="upd()"><button onclick="this.parentElement.remove(); upd()" class="btn-delete">✕</button>`;
    container.appendChild(div);
    upd();
}

function upd() {
    const d = {
        eNom: document.getElementById('eNom').value,
        eCuit: document.getElementById('eCuit').value,
        cNom: document.getElementById('cNom').value,
        ePago: document.getElementById('ePago').value,
        tipoF: document.getElementById('tipoF').value,
        fec: document.getElementById('fecManual').value
    };

    // Lógica Fiscal
    const pCondicion = document.getElementById('p-condicion');
    if(d.tipoF === 'C') {
        pCondicion.innerText = "Responsable Monotributo";
    } else {
        pCondicion.innerText = "Responsable Inscripto";
    }

    document.getElementById('p-eNom').innerText = d.eNom || "MI EMPRESA";
    document.getElementById('p-eCuit').innerText = d.eCuit || "...";
    document.querySelector('.f-letra').innerText = d.tipoF;
    document.getElementById('p-fec').innerText = d.fec;
    document.getElementById('p-cNom').innerText = d.cNom || "...";
    document.getElementById('p-pago').innerText = d.ePago || "...";

    let total = 0; let htmlItems = "";
    document.querySelectorAll('.item-row').forEach(row => {
        const desc = row.querySelector('.i-desc').value;
        const cant = parseFloat(row.querySelector('.i-cant').value) || 0;
        const prec = parseFloat(row.querySelector('.i-precio').value) || 0;
        const sub = cant * prec; total += sub;
        if(desc) htmlItems += `<tr><td>${cant}</td><td>${desc}</td><td>$${prec.toLocaleString()}</td><td>$${sub.toLocaleString()}</td></tr>`;
    });
    document.getElementById('p-items').innerHTML = htmlItems || "<tr><td>1</td><td>-</td><td>$0</td><td>$0</td></tr>";
    document.getElementById('p-tot').innerText = "$ " + total.toLocaleString();
    
    localStorage.setItem('config_padre', JSON.stringify({eNom: d.eNom, eCuit: d.eCuit, ePago: d.ePago}));
}

function capturarURL() {
    const p = new URLSearchParams(window.location.search);
    ['eNom', 'eCuit', 'ePago', 'cNom', 'tel', 'email', 'tipoF'].forEach(f => { if(p.has(f)) document.getElementById(f).value = decodeURIComponent(p.get(f)); });
    if (p.has('articulo1')) {
        document.getElementById('items-container').innerHTML = '';
        let i = 1; while(p.has(`articulo${i}`)) { addItem(p.get(`articulo${i}`), p.get(`cant${i}`) || 1, p.get(`monto${i}`)); i++; }
    } else { addItem(); }
}

async function enviar(canal) {
    const cliente = document.getElementById('cNom').value;
    const canvas = await html2canvas(document.getElementById('preview-box'), {scale: 2});
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
    pdf.save(`Factura_${cliente}.pdf`);

    if(canal === 'wa') {
        let msg = `📄 *FACTURA DIGITAL*%0A━━━━━━━━━━━━━━━━%0A👤 *Cliente:* ${cliente}%0A💰 *TOTAL: ${document.getElementById('p-tot').innerText}*%0A💳 *Pago:* ${document.getElementById('ePago').value}`;
        window.open(`https://api.whatsapp.com/send?phone=${document.getElementById('tel').value}&text=${msg}`);
    } else {
        const btn = document.getElementById('btnM'); btn.innerText = "ENVIANDO...";
        emailjs.send("service_t5t4wor", "template_vyjg8af", { 
            to_email: document.getElementById('email').value, 
            to_name: cliente, 
            total_monto: document.getElementById('p-tot').innerText 
        }).then(() => { alert("Enviado!"); btn.innerText = "📧 ENVIAR POR MAIL"; });
    }
}

async function copiarImagen() {
    const canvas = await html2canvas(document.getElementById('preview-box'), {scale:2});
    canvas.toBlob(blob => navigator.clipboard.write([new ClipboardItem({"image/png": blob})]));
    alert("¡Imagen copiada!");
}

window.onload = () => {
    const c = JSON.parse(localStorage.getItem('config_padre'));
    if(c) { Object.keys(c).forEach(k => { if(document.getElementById(k)) document.getElementById(k).value = c[k]; }); }
    document.getElementById('fecManual').value = new Date().toLocaleDateString();
    capturarURL(); upd();
};
