import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function main() {
    const res = await fetch('/__/firebase/init.json');
    const config = await res.json();
    const app = initializeApp(config);
    const db = getFirestore(app);
    emailjs.init("ne2_1nbxGq2hC0ju1");

    // 1. Manejo de la Preview
    const updatePreview = () => {
        document.getElementById('pre-nombre').innerText = document.getElementById('nombre').value || "...";
        document.getElementById('pre-detalle').innerText = document.getElementById('detalle').value || "...";
        document.getElementById('pre-total').innerText = "$ " + (document.getElementById('precio').value || "0.00");
        document.getElementById('pre-tipo').innerText = document.getElementById('tipoFactura').value;
        document.getElementById('pre-concepto').innerText = document.getElementById('concepto').value;
    };

    // 2. Funciones Globales para el HTML
    window.toggleFechas = () => {
        const div = document.getElementById('seccionFechas');
        div.classList.toggle('hidden', document.getElementById('concepto').value === 'Productos');
        updatePreview();
    };

    window.adaptarCampos = () => {
        const tipo = document.getElementById('tipoFactura').value;
        const extra = document.getElementById('camposExtra');
        extra.innerHTML = (tipo === 'A') ? 
            `<label>CUIT Cliente</label><input type="number" id="dni" required><label>Domicilio</label><input type="text" id="domicilio" required>` :
            `<label>DNI / CUIT (Opcional)</label><input type="number" id="dni">`;
        updatePreview();
    };

    // Listeners
    ['nombre', 'detalle', 'precio', 'tipoFactura', 'concepto'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });

    window.enviarWA = (tel, nom, tot) => {
        window.open(`https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent('Hola *'+nom+'*, adjunto factura por *$'+tot+'*')}`, '_blank');
    };

    window.marcarPagado = async (id) => {
        await updateDoc(doc(db, "facturas", id), { estado: 'pagado' });
        cargarHistorial();
    };

    // 3. Cargar Historial
    const cargarHistorial = async () => {
        const q = query(collection(db, "facturas"), orderBy("creado", "desc"));
        const snap = await getDocs(q);
        const body = document.getElementById('tablaBody');
        body.innerHTML = "";
        snap.forEach(r => {
            const f = r.data();
            body.innerHTML += `<tr>
                <td>${f.fechaManual || f.creado.split('T')[0]}</td>
                <td>${f.tipo}</td>
                <td>${f.nombre}</td>
                <td>$${f.total}</td>
                <td><span class="status ${f.estado}">${f.estado}</span></td>
                <td>
                    <button class="btn-wa" onclick="enviarWA('${f.tel}','${f.nombre}','${f.total}')">WA</button>
                    ${f.estado === 'pendiente' ? `<button onclick="marcarPagado('${r.id}')">✔️</button>` : ''}
                </td>
            </tr>`;
        });
    };

    // 4. Formulario
    document.getElementById('facturaForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnGenerar');
        btn.disabled = true;

        const data = {
            nombre: document.getElementById('nombre').value,
            concepto: document.getElementById('concepto').value,
            detalle: document.getElementById('detalle').value,
            total: parseFloat(document.getElementById('precio').value),
            tipo: document.getElementById('tipoFactura').value,
            tel: document.getElementById('telefono').value,
            email: document.getElementById('email').value,
            estado: document.getElementById('estadoPago').value,
            fechaManual: document.getElementById('fechaManual').value,
            creado: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, "facturas"), data);
            
            // Generar PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            pdf.text(`FACTURA ${data.tipo}`, 105, 20, {align:'center'});
            pdf.text(`Cliente: ${data.nombre}`, 20, 40);
            pdf.text(`Total: $${data.total}`, 20, 60);
            pdf.save(`Factura.pdf`);

            // EmailJS
            await emailjs.send("service_t5t4wor", "template_acd00wp", {
                to_email: data.email,
                to_name: data.nombre,
                total: data.total
            });

            alert("Éxito");
            cargarHistorial();
        } catch (err) { alert(err); }
        btn.disabled = false;
    };

    adaptarCampos();
    cargarHistorial();
}
main();
