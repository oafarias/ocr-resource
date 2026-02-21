// ============================================================
// CONFIGURAÇÃO DE AZURE 
// CHAVES GERADAS NA MICROSOFT FOUNDRY | COMPUTER VISION - PESQUISA VISÃO COMPUTACIONAL
// ============================================================
const visionEndPoint = ""; // insira seu endpoint do recurso
const visionKey = ""; // insira a chave da sua API

// ============================================================
// CAPTURA DOS ELEMENTOS DA PÁGINA (DOM)
// ============================================================
const fileInput = document.getElementById("imagem");
const divMensagens = document.getElementById("div_mensagens");
const divResultadosOCR = document.querySelector(".div_resultado_ocr"); // Capturando pela classe conforme o HTML
const textoOCRArea = document.getElementById("texto_ocr");

// ============================================================
// FUNÇÕES AUXILIARES DE INTERFACE (UI)
// ============================================================

function addLog(message, type = 'info') {
    const now = new Date().toLocaleTimeString();
    divMensagens.innerHTML += `<div class="message ${type}">[${now}] ${message}</div>`;
    divMensagens.scrollTop = divMensagens.scrollHeight;
}

function clearResults() {
    divMensagens.innerHTML = '';
    
    // Remove especificamente o container da imagem se ele existir
    const existingContainer = document.getElementById("image_container");
    if (existingContainer) existingContainer.remove();

    textoOCRArea.value = '';
    divResultadosOCR.style.display = "none";
    addLog("Pronto para um novo processamento.", 'info');
}

// ============================================================
// DESENHAR BOUNDING BOXES
// ============================================================

function drawBoundingBoxes(imageFile, ocrData) {
    // Limpa apenas elementos visuais extras, mantém o textarea
    const existingContainer = document.getElementById("image_container");
    if (existingContainer) existingContainer.remove();
    
    divResultadosOCR.style.display = "block";

    const imageContainer = document.createElement("div");
    imageContainer.id = "image_container";

    const img = document.createElement("img");
    const reader = new FileReader();

    reader.onload = function (e) {
        img.src = e.target.result;
        imageContainer.appendChild(img);
        
        // Insere a imagem antes do título do textarea
        divResultadosOCR.insertBefore(imageContainer, divResultadosOCR.firstChild);

        img.onload = () => {
            const scaleFactorX = img.clientWidth / img.naturalWidth;
            const scaleFactorY = img.clientHeight / img.naturalHeight;

            const results = ocrData.analyzeResult?.readResults || ocrData.recognitionResults || [];

            results.forEach((page) => {
                page.lines.forEach((line) => {
                    const box = line.boundingBox;
                    const rect = document.createElement("div");
                    rect.className = "bounding-box-ocr";

                    rect.style.left = `${box[0] * scaleFactorX}px`;
                    rect.style.top = `${box[1] * scaleFactorY}px`;
                    rect.style.width = `${(box[4] - box[0]) * scaleFactorX}px`;
                    rect.style.height = `${(box[5] - box[1]) * scaleFactorY}px`;

                    imageContainer.appendChild(rect);
                });
            });
        };
    };
    reader.readAsDataURL(imageFile);
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function executeOCR() {
    clearResults();
    const file = fileInput.files[0];

    if (!file) {
        addLog("🚫 Por favor, selecione um arquivo primeiro.", 'error');
        return;
    }

    const url = `${visionEndPoint}vision/v3.2/read/analyze`;

    try {
        addLog(`Iniciando OCR para: ${file.name}...`, 'info');
        const arrayBuffer = await file.arrayBuffer();

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Ocp-Apim-Subscription-Key": visionKey,
                "Content-Type": "application/octet-stream",
            },
            body: arrayBuffer,
        });

        if (response.status !== 202) throw new Error("Falha ao enviar para Azure.");

        const operationLocation = response.headers.get("operation-location");
        let data = null;
        
        // Loop de Polling
        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 2000));
            addLog(`Verificando status (${i+1}/15)...`);

            const res = await fetch(operationLocation, {
                headers: { "Ocp-Apim-Subscription-Key": visionKey }
            });
            data = await res.json();

            if (data.status === "succeeded") break;
            if (data.status === "failed") throw new Error("OCR Falhou.");
        }

        if (data.status === "succeeded") {
            const results = data.analyzeResult?.readResults;
            const texto = results.map(p => p.lines.map(l => l.text).join(" ")).join("\n");
            
            divResultadosOCR.style.display = "block";
            textoOCRArea.value = texto;
            addLog("OCR concluído! ✅", 'success');
            drawBoundingBoxes(file, data);
        }

    } catch (error) {
        addLog(`Erro: ${error.message}`, 'error');
    }
}

// Event Listeners
document.getElementById("btnOCR").addEventListener("click", executeOCR);
clearResults();