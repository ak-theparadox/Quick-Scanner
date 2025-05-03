const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const resultDiv = document.getElementById('result');
    const errorMessageDiv = document.getElementById('errorMessage');
    const videoContainer = document.getElementById('video-container');
    const canvasContext = canvas.getContext('2d');
    const scanButton = document.getElementById('scanButton');

    let scanning = false;
    let stream = null;
    let barcodeDetector = null; // ZXing barcode detector

    function showErrorMessage(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.remove('hidden');
    }

    function hideErrorMessage() {
        errorMessageDiv.classList.add('hidden');
        errorMessageDiv.textContent = '';
    }

    function startScan() {
        hideErrorMessage();
        scanning = true;
        video.classList.remove('hidden');
        scanButton.textContent = 'Stop Scan'; // Change button text

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(vidStream => {
                stream = vidStream;
                video.srcObject = stream;
                video.setAttribute('playsinline', 'true');
                video.play();
                requestAnimationFrame(scan);
            })
            .catch(err => {
                scanning = false;
                showErrorMessage(`Error accessing camera: ${err.message}.  Please ensure you have a camera and allow camera access.`);
                videoContainer.classList.add('hidden');
                video.classList.add('hidden');
                scanButton.textContent = 'Scan New Code'; // Update button text
            });
    }

    function stopScan() {
        scanning = false;
        scanButton.textContent = 'Scan New Code'; // Change button text
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        video.classList.add('hidden');
    }

    async function scan() {
        if (!scanning) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);

            let result = null;

            // Try scanning for QR code first
            try {
                const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
                if (qrCode) {
                    result = { format: 'QR Code', data: qrCode.data };
                }
            } catch (error) {
                console.error("Error scanning QR code:", error);
                // Optionally show an error message, or just continue to barcode scanning
                // showErrorMessage("Error scanning QR code. Please try again.");
            }

            // If no QR code, try scanning for barcode
            if (!result) {
                try {
                    if (!barcodeDetector) {
                        barcodeDetector = new window.ZXing.BrowserMultiFormatReader();
                    }
                    const barcodeResult = await barcodeDetector.decode(canvas);
                    if (barcodeResult) {
                        result = { format: barcodeResult.format, data: barcodeResult.text };
                    }
                } catch (error) {
                    console.error("Error scanning barcode:", error);
                    // showErrorMessage("Error scanning barcode. Please try again.");
                }
            }

            if (result) {
                stopScan();
                let resultText = result.data;
                const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)?\/?$/;
                if (urlRegex.test(resultText)) {
                    resultDiv.innerHTML = `<a href="${resultText}" target="_blank" class="text-blue-400 hover:underline">${resultText}</a>`;
                } else {
                    resultDiv.textContent = `Format: ${result.format}, Result: ${resultText}`;
                }
                resultDiv.classList.remove('bg-gray-100');
                resultDiv.style.display = 'block';
                scanButton.style.display = 'block';
            } else {
                requestAnimationFrame(scan);
            }
        } else {
            requestAnimationFrame(scan);
        }
    }

    // Start scanning automatically when the page loads
    startScan();

    // Event listener for the button to start a new scan
    scanButton.addEventListener('click', () => {
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = '';
        scanButton.style.display = 'none';
        startScan();
    });
