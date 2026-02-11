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
    // --- STATE ---
    let activeTab = 'agent'; // 'agent' or 'sales'
    let currentChatId = null;
    let currentUserEmail = null;

    // --- INIT ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserEmail = user.email; // Assuming client is logged in
            loadConversations();
        } else {
            document.getElementById('empty-state').classList.remove('hidden');
            document.getElementById('chatLoader').classList.add('hidden');
        }
    });

    // --- 1. LOAD LIST ---
    function loadConversations() {
        if (!currentUserEmail) return;

        // Listener for real-time updates
        db.collection('orders')
          .where('clientEmail', '==', currentUserEmail)
          .onSnapshot(snapshot => {
              const agentList = document.getElementById('agent-list');
              const salesList = document.getElementById('sales-list');
              const loader = document.getElementById('chatLoader');
              const empty = document.getElementById('empty-state');
              
              loader.classList.add('hidden');
              agentList.innerHTML = '';
              salesList.innerHTML = '';

              if (snapshot.empty) {
                  empty.classList.remove('hidden');
                  return;
              }
              empty.classList.add('hidden');

              snapshot.forEach(doc => {
                  const data = doc.data();
                  
                  // In a real app, you might query a separate 'chats' collection.
                  // Here we simulate the chat metadata living on the Order object for efficiency.
                  
                  // 1. Agent Entry
                  agentList.innerHTML += renderChatCard({
                      id: doc.id,
                      type: 'agent',
                      name: data.agentName || 'Unassigned Agent',
                      orderTitle: data.title,
                      timestamp: data.lastAgentMsgTime || data.createdAt,
                      unread: data.agentUnreadCount || 0, // Mock field
                      lastMsg: "Click to view latest updates on your order..."
                  });

                  // 2. Sales Entry
                  salesList.innerHTML += renderChatCard({
                      id: doc.id,
                      type: 'sales',
                      name: data.salesName || 'Sales Representative',
                      orderTitle: data.title,
                      timestamp: data.lastSalesMsgTime || data.createdAt,
                      unread: data.salesUnreadCount || 0, // Mock field
                      lastMsg: "Let us know if you need to upgrade."
                  });
              });
          });
    }

    // --- 2. RENDER CARD ---
    function renderChatCard(chat) {
        // Time formatting
        const date = chat.timestamp ? new Date(chat.timestamp.seconds * 1000) : new Date();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Badge Logic
        const badgeCount = chat.unread > 9 ? '9+' : chat.unread;
        const badgeHTML = chat.unread > 0 
            ? `<div class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">${badgeCount}</div>` 
            : '';
        
        // Font weights based on read status
        const titleClass = chat.unread > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700';
        const msgClass = chat.unread > 0 ? 'font-semibold text-slate-800' : 'text-gray-500';
        const iconColor = chat.type === 'agent' ? 'from-blue-500 to-indigo-600' : 'from-emerald-500 to-teal-600';
        const initial = chat.name.charAt(0);

        return `
        <div onclick="openChat('${chat.id}', '${chat.type}', '${chat.name}', '${chat.orderTitle}')" class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform flex items-center space-x-4 cursor-pointer">
            <div class="relative">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br ${iconColor} flex items-center justify-center text-white text-lg font-bold shadow-sm">
                    ${initial}
                </div>
                ${badgeHTML}
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-baseline mb-0.5">
                    <h4 class="${titleClass} text-sm truncate pr-2">${chat.name}</h4>
                    <span class="text-[10px] text-gray-400 font-medium whitespace-nowrap">${timeStr}</span>
                </div>
                <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5 truncate">
                    ${chat.orderTitle}
                </div>
                <p class="${msgClass} text-xs truncate">
                    ${chat.lastMsg}
                </p>
            </div>
        </div>
        `;
    }

    // --- 3. UI TOGGLE ---
    function switchChatTab(tab) {
        activeTab = tab;
        const bg = document.getElementById('tab-bg');
        const agentBtn = document.getElementById('tab-btn-agent');
        const salesBtn = document.getElementById('tab-btn-sales');
        const agentList = document.getElementById('agent-list');
        const salesList = document.getElementById('sales-list');

        if (tab === 'agent') {
            bg.style.transform = 'translateX(0)';
            agentBtn.classList.replace('text-gray-500', 'text-slate-800');
            agentBtn.classList.add('font-semibold');
            salesBtn.classList.replace('text-slate-800', 'text-gray-500');
            salesBtn.classList.remove('font-semibold');
            
            agentList.classList.remove('hidden');
            salesList.classList.add('hidden');
        } else {
            bg.style.transform = 'translateX(100%)'; // Moves 100% of its own width + gap
            // CSS calculation in HTML handles the width, transform handles position
            salesBtn.classList.replace('text-gray-500', 'text-slate-800');
            salesBtn.classList.add('font-semibold');
            agentBtn.classList.replace('text-slate-800', 'text-gray-500');
            agentBtn.classList.remove('font-semibold');

            salesList.classList.remove('hidden');
            agentList.classList.add('hidden');
        }
    }

    // --- 4. CHAT MODAL LOGIC ---
    function openChat(orderId, type, name, title) {
        currentChatId = orderId;
        
        // Update Header
        document.getElementById('chatHeaderName').innerText = name;
        document.getElementById('chatHeaderOrder').innerText = title;
        document.getElementById('chatHeaderAvatar').innerText = name.charAt(0);
        
        // Load Dummy Messages (Replace with real Firestore query on subcollection 'messages')
        const container = document.getElementById('messagesContainer');
        container.innerHTML = `
            <div class="text-center text-xs text-gray-300 my-4 uppercase font-bold tracking-widest">Today</div>
            
            <div class="flex items-end mb-4">
                <div class="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm max-w-[75%]">
                    <p class="text-sm text-gray-800">Hello! I am working on your ${title}. Do you have the specific color codes?</p>
                </div>
                <span class="text-[9px] text-gray-400 ml-2 mb-1">10:00 AM</span>
            </div>

            <div class="flex items-end justify-end mb-4">
                <span class="text-[9px] text-gray-400 mr-2 mb-1">10:05 AM</span>
                <div class="bg-blue-600 rounded-2xl rounded-br-none px-4 py-3 shadow-sm max-w-[75%]">
                    <p class="text-sm text-white">Hi! Yes, I will send them shortly.</p>
                </div>
            </div>
        `;

        // Animation In
        const modal = document.getElementById('chatModal');
        const panel = document.getElementById('chatPanel');
        const backdrop = document.getElementById('chatBackdrop');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            panel.classList.remove('translate-y-full');
        }, 10);
    }

    function closeChat() {
        const modal = document.getElementById('chatModal');
        const panel = document.getElementById('chatPanel');
        const backdrop = document.getElementById('chatBackdrop');

        backdrop.classList.add('opacity-0');
        panel.classList.add('translate-y-full');

        setTimeout(() => {
            modal.classList.add('hidden');
            currentChatId = null;
        }, 300);
    }

    function sendMessage() {
        const input = document.getElementById('msgInput');
        const text = input.value.trim();
        if (!text) return;

        // UI Optimistic Update
        const container = document.getElementById('messagesContainer');
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        container.innerHTML += `
            <div class="flex items-end justify-end mb-4 animate-fade-in">
                <span class="text-[9px] text-gray-400 mr-2 mb-1">${time}</span>
                <div class="bg-blue-600 rounded-2xl rounded-br-none px-4 py-3 shadow-sm max-w-[75%]">
                    <p class="text-sm text-white">${text}</p>
                </div>
            </div>
        `;

        input.value = '';
        container.scrollTop = container.scrollHeight;

        // TODO: Save to Firestore
        // db.collection('orders').doc(currentChatId).collection('messages').add({ ... })
    }

