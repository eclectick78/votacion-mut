const SUPABASE_URL = 'https://fzxxnyeqeymabouuwhnt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eHhueWVxZXltYWJvdXV3aG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTcxMDcsImV4cCI6MjA2Mjk3MzEwN30.AcqmES6E_PJL5KNDcDHRq4ONyu2RWvgbeMkCPqcC2yk';

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_USER_ID = '3c7ec8da-cb01-4b49-9e3a-3b25ed8114e3';

const adminContent = document.getElementById('admin-content');
const accessDeniedMessage = document.getElementById('access-denied');
const loginPromptAdmin = document.getElementById('login-prompt-admin');
const userInfoAdminDiv = document.getElementById('user-info-admin');

// Ya no necesitamos votesTableBody
// const votesTableBody = document.querySelector('#votes-table tbody');
const totalIndividualVotesSpan = document.getElementById('total-individual-votes'); // ID actualizado
const summaryVotesTableBody = document.querySelector('#summary-votes-table tbody');

async function fetchAndDisplayVotes() {
    // Actualizada la condición del if
    if (!summaryVotesTableBody || !totalIndividualVotesSpan) {
        console.error("Alguno de los elementos de la tabla de resumen o el span de total no fue encontrado.");
        return;
    }
    summaryVotesTableBody.innerHTML = '';

    // Solo necesitamos 'espectaculo' para el resumen.
    // Podríamos pedir también 'timestamp' si quisiéramos ordenar la consulta inicial,
    // pero no es estrictamente necesario para el conteo.
    const selectColumns = 'espectaculo'; // Simplificado
    // const orderByColumn = 'timestamp'; // Ya no necesitamos ordenar la consulta detallada

    console.log(`Intentando seleccionar columnas: "${selectColumns}"`);

    const { data: votes, error } = await client
        .from('votos')
        .select(selectColumns); // Simplificada la consulta
        // .order(orderByColumn, { ascending: false }); // Ya no es necesario ordenar aquí

    if (error) {
        console.error('Error fetching votes:', error);
        console.error('Detailed error object:', JSON.stringify(error, null, 2));
        alert('Error al cargar los votos: ' + (error.message || JSON.stringify(error)));
        // ... (resto del manejo de errores como estaba)
        return;
    }

    if (votes && votes.length > 0) {
        totalIndividualVotesSpan.textContent = votes.length; // Total de registros en la tabla 'votos'

        // --- Calcular resumen de votos por espectáculo ---
        const votesByShow = {};
        votes.forEach(vote => {
            if (vote.espectaculo) {
                votesByShow[vote.espectaculo] = (votesByShow[vote.espectaculo] || 0) + 1;
            }
        });

        const sortedSummary = Object.entries(votesByShow)
            .sort(([, countA], [, countB]) => countB - countA);

        if (sortedSummary.length > 0) {
            sortedSummary.forEach(([showName, count]) => {
                const row = summaryVotesTableBody.insertRow();
                row.insertCell().textContent = showName;
                row.insertCell().textContent = count;
            });
        } else { // sortedSummary está vacío pero votes tenía datos (no debería pasar si votes tiene espectaculos)
            const row = summaryVotesTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 2;
            cell.textContent = 'No hay votos para resumir (pero hay registros).';
        }

        // --- SECCIÓN DE TABLA DETALLADA ELIMINADA ---

    } else if (votes) { // votes es un array vacío
        totalIndividualVotesSpan.textContent = '0';
        const summaryRow = summaryVotesTableBody.insertRow();
        const summaryCell = summaryRow.insertCell();
        summaryCell.colSpan = 2;
        summaryCell.textContent = 'No hay votos registrados.';

    } else { // votes es null o undefined
        totalIndividualVotesSpan.textContent = 'Error';
        const summaryRow = summaryVotesTableBody.insertRow();
        const summaryCell = summaryRow.insertCell();
        summaryCell.colSpan = 2;
        summaryCell.textContent = 'Hubo un problema al cargar los datos.';
    }
}

// --- El resto de admin.js (onAuthStateChange, initialAuthCheck) permanece igual ---

client.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;

    loginPromptAdmin.classList.add('hidden');
    accessDeniedMessage.classList.add('hidden');
    adminContent.style.display = 'none';
    userInfoAdminDiv.innerHTML = '';

    if (user) {
        console.log('Admin page: User logged in:', user.email, user.id);
        userInfoAdminDiv.innerHTML = `
            Conectado como: ${user.email}
            <button id="logout-btn-admin">Cerrar Sesión</button>
        `;
        const logoutBtn = document.getElementById('logout-btn-admin');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await client.auth.signOut();
            });
        }

        if (user.id === ADMIN_USER_ID) {
            console.log('Admin access GRANTED');
            adminContent.style.display = 'block';
            fetchAndDisplayVotes();
        } else {
            console.log('Admin access DENIED. User ID:', user.id, 'Expected ADMIN_USER_ID:', ADMIN_USER_ID);
            accessDeniedMessage.classList.remove('hidden');
        }
    } else {
        console.log('Admin page: User logged out or no session');
        loginPromptAdmin.classList.remove('hidden');
    }
});

async function initialAuthCheck() {
    const { data: { session } } = await client.auth.getSession();
     if (!session) {
        // onAuthStateChange se encargará
    }
}
initialAuthCheck();