import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function iniciarApp() {
    const response = await fetch('/__/firebase/init.json');
    const config = await response.json();
    const app = initializeApp(config);
    const db = getFirestore(app);

    emailjs.init("ne2_1nbxGq2hC0ju1"); // Tu Public Key

    document.getElementById('facturaForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnGuardar');
        btn.disabled = true;

        const formData = {
            nombre: document.getElementById('nombre').value,
            dni: document.getElementById('dni').value,
            email: document.getElementById('email').value,
            tel: document.getElementById('telefono').value,
            tipo: document.getElementById('tipoFactura').value, // A, B o C
            item: document.getElementById('tipoItem').value,
            detalle: document.getElementById('detalle').value,
            precioFinal: parseFloat(document.getElementById('precio').value),
            fechaE: document.getElementById('fechaE').value,
            fechaS: document.getElementById('fechaS').value
        };

        try {
            // --- LÓGICA DE IMPUESTOS ARGENTINA ---
            let neto = 0, iva = 0, total = formData.precioFinal;
            
            if (formData.tipo === "A") {
                // En Factura A, el precio ingresado suele ser el NETO
                neto = formData.precioFinal;
                iva = neto * 0.21;
                total = neto + iva;
            } else {
                // En Factura B y C, el IVA no se discrimina (está incluido)
                neto = total / 1.21;
                iva = total - neto;
            }

            // 1. Guardar en Firestore
            await addDoc(collection(db, "facturas"), { ...formData, total, neto, iva });

            // 2. Generar PDF (jspdf)
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Recuadro central Tipo de Factura
            doc.rect(95, 10, 20, 20);
            doc.setFontSize(25); doc.text(formData.tipo, 101, 25);
            doc.setFontSize(8); doc.text(formData.tipo === "A" ? "COD. 01" : "COD. 06", 99, 29);

            // Datos Emisor (Simulado RI)
            doc.setFontSize(10);
            doc.text("EMISOR: TU RAZÓN SOCIAL S.A.", 20, 20);
            doc.text("CUIT: 30-XXXXXXXX-0", 20, 25);
            doc.text("Condición IVA: Responsable Inscripto", 20, 30);

            // Datos Receptor
            doc.line(20, 45, 190, 45);
            doc.text(`Cliente: ${formData.nombre}`, 20, 55);
            doc.text(`CUIT/DNI: ${formData.dni}`, 140, 55);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 140, 60);

            // Detalle
            let desc = formData.detalle;
            if(formData.item === 'servicio') desc = `Servicio E: ${formData.fechaE} S: ${formData.fechaS} - ${desc}`;
            
            doc.text("Descripción", 20, 80);
            doc.text("Subtotal", 170, 80, { align: "right" });
            doc.line(20, 82, 190, 82);
            doc.text(desc, 20, 90, { maxWidth: 130 });
            doc.text(`$${neto.toFixed(2)}`, 170, 90, { align: "right" });

            // Pie de importes según tipo
            if (formData.tipo === "A") {
                doc.text(`Neto Gravado: $${neto.toFixed(2)}`, 140, 130);
                doc.text(`IVA 21%: $${iva.toFixed(2)}`, 140, 137);
            }
            doc.setFontSize(14);
            doc.text(`TOTAL: $${total.toFixed(2)}`, 140, 150);
            
            // CAE (Simulado para que parezca real)
            doc.setFontSize(9);
            doc.text("CAE N°: 74023948573625", 20, 270);
            doc.text("Vto. CAE: " + new Date().toLocaleDateString(), 20, 275);

            // 3. Descargar PDF
            doc.save(`Factura_${formData.tipo}_${formData.nombre}.pdf`);

            // 4. Enviar Mail (EmailJS)
            await emailjs.send("service_t5t4wor", "template_acd00wp", {
                to_email: formData.email,
                to_name: formData.nombre,
                total_text: total.toFixed(2)
            });

            // 5. CONFIGURAR WHATSAPP (Abre link automático)
            const msg = `*Hola ${formData.nombre}*%0A` +
                        `Se ha generado tu *Factura ${formData.tipo}*%0A` +
                        `*Monto:* $${total.toFixed(2)}%0A` +
                        `*Detalle:* ${formData.detalle}%0A%0A` +
                        `La misma fue enviada a tu email: ${formData.email}.`;
            
            window.open(`https://wa.me/${formData.tel}?text=${msg}`, '_blank');

            alert("¡Procesado! Datos guardados, PDF descargado y WhatsApp abierto.");
            
        } catch (error) {
            console.error(error);
            alert("Error al procesar.");
        } finally {
            btn.disabled = false;
        }
    };
}
iniciarApp();