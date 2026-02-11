const firebaseConfig = {
            apiKey: "AIzaSyBDeDc6pWhghXmGYg9QYQ3nVAGTpo1u5AM",
            authDomain: "research-craft.firebaseapp.com",
            projectId: "research-craft",
            storageBucket: "research-craft.firebasestorage.app",
            messagingSenderId: "284823836570",
            appId: "1:284823836570:web:fb0d93cdf92368525d8c23",
            measurementId: "G-6H5BS98612"
        };


  // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase 8.10.0 Initialized");
            
            
        }

// --- 1. SETUP & AUTH LISTENER ---
const db = firebase.firestore();
const auth = firebase.auth();
    // --- CONFIGURATION ---
    // ⚠️ GITHUB CONFIG (From Prompt)
    const GITHUB_TOKEN = "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";
    const GITHUB_USERNAME = "svmcoder";
    const REPO_NAME = "storage";
    const BRANCH = "main";
    const ROOT_FOLDER = "uploads";

    // --- STATE ---
    let currentUser = null;
    let fileToDeleteId = null;

    // --- INIT ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadFiles();
            // Pre-load orders for the upload dropdown
            loadClientOrdersForSelect();
        } else {
            // Demo auth if needed
            // auth.signInAnonymously();
        }
    });

    // ================= UI LOGIC =================

    function openUploadModal() {
        const modal = document.getElementById('uploadModal');
        const panel = document.getElementById('uploadPanel');
        const backdrop = document.getElementById('uploadBackdrop');
        
        // Reset UI
        document.getElementById('fileInput').value = '';
        document.getElementById('uploadPlaceholder').classList.remove('hidden');
        document.getElementById('filePreview').classList.add('hidden');
        document.getElementById('progressContainer').classList.add('hidden');
        document.getElementById('btnUpload').disabled = false;
        document.getElementById('btnUpload').innerText = "Upload File";
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            panel.classList.remove('translate-y-full', 'md:translate-y-10');
        }, 10);
    }

    function closeUploadModal() {
        const modal = document.getElementById('uploadModal');
        const panel = document.getElementById('uploadPanel');
        const backdrop = document.getElementById('uploadBackdrop');
        
        backdrop.classList.add('opacity-0');
        panel.classList.add('translate-y-full', 'md:translate-y-10');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    // --- CUSTOM SELECT LOGIC ---
    function toggleOrderSelect() {
        const dropdown = document.getElementById('orderDropdown');
        const arrow = document.getElementById('orderSelectArrow');
        dropdown.classList.toggle('hidden');
        arrow.style.transform = dropdown.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    function selectOrder(id, title, agentId) {
        document.getElementById('selectedOrderId').value = id;
        document.getElementById('selectedOrderTitle').value = title;
        document.getElementById('selectedAgentId').value = agentId || '';
        
        document.getElementById('selectedOrderText').innerText = title;
        document.getElementById('selectedOrderText').classList.replace('text-gray-400', 'text-slate-800');
        document.getElementById('selectedOrderText').classList.add('font-semibold');
        
        toggleOrderSelect(); // Close dropdown
    }

    function handleFileSelect() {
        const file = document.getElementById('fileInput').files[0];
        if (file) {
            document.getElementById('uploadPlaceholder').classList.add('hidden');
            document.getElementById('filePreview').classList.remove('hidden');
            document.getElementById('fileNamePreview').innerText = file.name;
            document.getElementById('fileSizePreview').innerText = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        }
    }

    // ================= DATA LOGIC =================

    // 1. Load Client's Orders for Dropdown
    async function loadClientOrdersForSelect() {
        if(!currentUser) return;
        const dropdown = document.getElementById('orderDropdown');
        
        try {
            const snap = await db.collection('orders')
                .where('clientEmail', '==', currentUser.email)
                .get();

            if (snap.empty) {
                dropdown.innerHTML = '<div class="p-3 text-center text-xs text-gray-400">No active orders found.</div>';
                return;
            }

            let html = '';
            snap.forEach(doc => {
                const d = doc.data();
                html += `
                <div onclick="selectOrder('${doc.id}', '${d.title}', '${d.agentId}')" class="px-4 py-3 hover:bg-blue-50 cursor-pointer border-l-4 border-transparent hover:border-brand-primary transition-colors">
                    <div class="text-sm font-bold text-slate-700 truncate">${d.title}</div>
                    <div class="text-[10px] text-gray-400 font-mono">#${d.orderId || '---'}</div>
                </div>`;
            });
            dropdown.innerHTML = html;
        } catch (e) {
            console.error(e);
            dropdown.innerHTML = '<div class="p-3 text-center text-xs text-red-400">Error loading orders.</div>';
        }
    }

    // 2. Load Existing Files
    function loadFiles() {
        const grid = document.getElementById('filesGrid');
        const loader = document.getElementById('filesLoader');
        const empty = document.getElementById('emptyFilesState');
        
        loader.classList.remove('hidden');
        grid.innerHTML = '';
        empty.classList.add('hidden');

        db.collection('files')
            .where('uploadedByEmail', '==', currentUser.email) // Or userId
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                loader.classList.add('hidden');
                grid.innerHTML = '';
                
                if (snap.empty) {
                    empty.classList.remove('hidden');
                    return;
                }

                snap.forEach(doc => {
                    const f = doc.data();
                    grid.innerHTML += renderFileCard(doc.id, f);
                });
            });
    }

    function renderFileCard(id, f) {
        // Determine Icon
        const ext = f.filename.split('.').pop().toLowerCase();
        let iconClass = 'fa-file-alt text-gray-400';
        let bgClass = 'bg-gray-100';
        
        if (['jpg','jpeg','png','gif'].includes(ext)) { iconClass = 'fa-image text-purple-500'; bgClass = 'bg-purple-50'; }
        else if (['pdf'].includes(ext)) { iconClass = 'fa-file-pdf text-red-500'; bgClass = 'bg-red-50'; }
        else if (['doc','docx'].includes(ext)) { iconClass = 'fa-file-word text-blue-500'; bgClass = 'bg-blue-50'; }
        else if (['zip','rar'].includes(ext)) { iconClass = 'fa-file-archive text-yellow-500'; bgClass = 'bg-yellow-50'; }

        const dateStr = f.createdAt ? new Date(f.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';

        return `
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
            
            <button onclick="openDeleteModal('${id}')" class="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="fas fa-trash-alt"></i>
            </button>

            <div class="w-12 h-12 ${bgClass} rounded-xl flex items-center justify-center mb-4 text-2xl">
                <i class="fas ${iconClass}"></i>
            </div>

            <div class="mb-3">
                <h4 class="font-bold text-slate-800 text-sm truncate" title="${f.filename}">${f.filename}</h4>
                <p class="text-[10px] text-gray-400 uppercase font-bold mt-1 tracking-wide">${f.orderTitle || 'General'}</p>
            </div>

            <div class="flex items-center justify-between border-t border-gray-50 pt-3">
                <span class="text-xs text-gray-400">${dateStr}</span>
                <a href="${f.url}" target="_blank" class="text-brand-primary text-xs font-bold hover:underline">Download</a>
            </div>
        </div>
        `;
    }

    // 3. Upload Logic
    async function startUpload() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        const orderId = document.getElementById('selectedOrderId').value;
        const orderTitle = document.getElementById('selectedOrderTitle').value;
        const agentId = document.getElementById('selectedAgentId').value;

        if (!file) return alert("Please select a file.");
        if (!orderId) return alert("Please select an order for context.");

        // UI Updates
        const btn = document.getElementById('btnUpload');
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const progressStatus = document.getElementById('progressStatus');

        btn.disabled = true;
        progressContainer.classList.remove('hidden');

        // File Params
        const userId = currentUser.uid;
        const ext = file.name.split(".").pop();
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const finalName = `${baseName}_${code}.${ext}`;
        const path = `${ROOT_FOLDER}/${userId}/${finalName}`;

        const reader = new FileReader();

        // A. Read File
        reader.onprogress = e => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 60); // Reading is 60% of process visual
                progressBar.style.width = pct + "%";
                progressPercent.innerText = pct + "%";
                progressStatus.innerText = "Reading file...";
            }
        };

        reader.onload = async () => {
            // B. Prepare Upload
            const base64 = reader.result.split(",")[1];
            progressBar.style.width = "70%";
            progressStatus.innerText = "Uploading to GitHub...";

            try {
                // C. GitHub API Call
                const res = await fetch(
                    `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`,
                    {
                        method: "PUT",
                        headers: {
                            "Authorization": `Bearer ${GITHUB_TOKEN}`,
                            "Accept": "application/vnd.github+json"
                        },
                        body: JSON.stringify({
                            message: `Client upload: ${finalName}`,
                            content: base64,
                            branch: BRANCH
                        })
                    }
                );

                if (!res.ok) throw new Error("GitHub Upload Failed");

                progressBar.style.width = "90%";
                progressStatus.innerText = "Saving metadata...";

                // D. Firebase Save
                const publicUrl = `https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/${path}`;
                
                await db.collection("files").add({
                    filename: finalName,
                    url: publicUrl,
                    path: path,
                    
                    // Linking Context
                    orderId: orderId,
                    orderTitle: orderTitle,
                    agentId: agentId, // So agent sees it
                    
                    // User Context
                    uploadedBy: currentUser.uid,
                    uploadedByEmail: currentUser.email,
                    role: 'client',
                    
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // E. Success
                progressBar.style.width = "100%";
                progressPercent.innerText = "100%";
                progressStatus.innerText = "Complete!";
                
                setTimeout(() => {
                    closeUploadModal();
                    // Optional: Show Toast success
                }, 800);

            } catch (err) {
                console.error(err);
                alert("Upload failed: " + err.message);
                btn.disabled = false;
                progressContainer.classList.add('hidden');
            }
        };

        reader.readAsDataURL(file);
    }

    // 4. Delete Logic
    function openDeleteModal(id) {
        fileToDeleteId = id;
        const modal = document.getElementById('deleteModal');
        const panel = document.getElementById('deletePanel');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            panel.classList.remove('scale-95', 'opacity-0');
            panel.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    function closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        const panel = document.getElementById('deletePanel');
        
        panel.classList.remove('scale-100', 'opacity-100');
        panel.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
        fileToDeleteId = null;
    }

    async function confirmDelete() {
        if (!fileToDeleteId) return;
        
        try {
            // Delete from Firestore only (GitHub deletion requires SHA, simple remove from dashboard is often enough for UX)
            await db.collection('files').doc(fileToDeleteId).delete();
            closeDeleteModal();
        } catch(e) {
            alert("Error deleting file: " + e.message);
        }
    }
