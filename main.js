// --- main.js (VERSIÓN REFACTORIZADA) ---

// Objeto para centralizar todas las traducciones
const translations = {
  es: {
    festivalTitle: 'Festival MUT! 10 años',
    votePrompt: 'Vota tus 10 espectáculos preferidos',
    loginTitle: 'Inicia sesión para votar',
    loginEmailLabel: 'Correo electrónico:',
    loginSendLink: 'Enviar enlace',
    loginSending: 'Enviando...',
    loginCancel: 'Cancelar',
    loginErrorFormat: 'El correo no tiene un formato válido.',
    loginErrorSend: 'Error al enviar el correo. Inténtalo de nuevo.',
    loginSuccess: 'Revisa tu correo para continuar.',
    legalText: 'Al participar aceptas el tratamiento de tus datos personales con la única finalidad de gestionar tu voto en el Festival MUT!. Más información en nuestra <a href="privacidad.html" target="_blank">Política de privacidad</a>.',
    ficha: 'Ficha',
    votar: 'Votar',
    desvotar: 'Desvotar',
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    logout: 'Cerrar sesión',
    errorConsultVotes: "Error al consultar tus votos. Inténtalo de nuevo.",
    errorDeleteVote: "No se ha podido borrar el voto.",
    errorRegisterVote: "No se ha podido registrar el voto.",
    limit10Votes: "Ya has votado 10 espectáculos.",
    videoNotAvailable: "Vídeo no disponible."
  },
  va: {
    festivalTitle: 'Festival MUT! 10 anys',
    votePrompt: 'Vota els teus 10 espectacles preferits',
    loginTitle: 'Inicia sessió per votar',
    loginEmailLabel: 'Email:',
    loginSendLink: 'Enviar enllaç',
    loginSending: 'Enviant...',
    loginCancel: 'Cancelar',
    loginErrorFormat: 'El correu no té un format vàlid.',
    loginErrorSend: 'Error en enviar el correu. Torna-ho a intentar.',
    loginSuccess: 'Revisa el teu correu per continuar.',
    legalText: 'En participar acceptes el tractament de les teues dades personals amb l’única finalitat de gestionar el teu vot en el Festival MUT!. Més informació a la nostra <a href="privacidad.html" target="_blank">Política de privacitat</a>.',
    ficha: 'Fitxa',
    votar: 'Votar',
    desvotar: 'Desvotar',
    anterior: 'Anterior',
    siguiente: 'Següent',
    logout: 'Tancar sessió',
    errorConsultVotes: "Error en consultar els teus vots. Torna-ho a intentar.",
    errorDeleteVote: "No s'ha pogut esborrar el vot.",
    errorRegisterVote: "No s'ha pogut registrar el vot.",
    limit10Votes: "Ja has votat 10 espectacles.",
    videoNotAvailable: "Vídeo no disponible."
  }
};

// Validación de formato de email
function esEmailValido(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

const SUPABASE_URL = 'https://fzxxnyeqeymabouuwhnt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eHhueWVxZXltYWJvdXV3aG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTcxMDcsImV4cCI6MjA2Mjk3MzEwN30.AcqmES6E_PJL5KNDcDHRq4ONyu2RWvgbeMkCPqcC2yk';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.');
const redirectTo = isLocalhost
  ? 'http://localhost:5500'
  : 'https://vota.festivalmut.com/';

console.log("Antes de crear cliente Supabase. window.supabase es:", window.supabase);
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Cliente Supabase creado:", client);

let user = null; // Variable global para el usuario
let espectaculos = []; // Variable global para los espectáculos, poblada por renderCards
let currentLang = localStorage.getItem('lang') || 'va';
let votosGlobalesDelUsuario = []; // Votos del usuario actual, actualizados desde DB

function getVideoEmbedHTML(url) {
  if (!url) return `<p>${translations[currentLang].videoNotAvailable}</p>`;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
  if (ytMatch) {
    return `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allowfullscreen></iframe>`;
  }
  return `<p>${translations[currentLang].videoNotAvailable}</p>`;
}

// --- Variables cacheadas del DOM (declaradas fuera para estar disponibles globalmente si es necesario, o dentro de DOMContentLoaded) ---
let cardContainer, fichaModal, fichaModalVideo, fichaModalTitle, fichaModalCompany,
    fichaModalYear, fichaModalSynopsis, fichaModalControls, fichaModalCloseButton,
    loginModal, loginForm, loginCancelButton, loginEmailInput, loginMessageElement, loginSubmitButton,
    userInfoElement, headerTitleElement, headerPElement, parallaxBgElement, legalTextElement;


// Función para actualizar el contenido de la modal de ficha
function updateFichaModalContent(espectaculo) {
  if (!espectaculo || !fichaModal || !fichaModalVideo || !fichaModalTitle || !fichaModalCompany || !fichaModalYear || !fichaModalSynopsis) {
    console.error("Elementos de la modal de ficha o espectáculo no encontrados/válidos para actualizar.");
    return;
  }
  fichaModalVideo.innerHTML = getVideoEmbedHTML(espectaculo.video);
  fichaModalTitle.textContent = espectaculo.titulo;
  fichaModalCompany.textContent = espectaculo.compania;
  fichaModalYear.textContent = espectaculo.anio;
  fichaModalSynopsis.textContent = currentLang === 'es' ? espectaculo.sinopsis_es : espectaculo.sinopsis_val;

  // Actualizar botones de navegación
  if (fichaModalControls) {
    fichaModalControls.innerHTML = ''; // Limpiar controles existentes
    const currentIndex = espectaculos.findIndex(e => e.titulo === espectaculo.titulo);

    const btnAnterior = document.createElement('button');
    btnAnterior.textContent = translations[currentLang].anterior;
    btnAnterior.classList.add('modal-nav-btn');
    btnAnterior.addEventListener('click', () => {
      const prevIndex = (currentIndex - 1 + espectaculos.length) % espectaculos.length;
      updateFichaModalContent(espectaculos[prevIndex]); // Llamada recursiva controlada
    });

    const btnSiguiente = document.createElement('button');
    btnSiguiente.textContent = translations[currentLang].siguiente;
    btnSiguiente.classList.add('modal-nav-btn');
    btnSiguiente.addEventListener('click', () => {
      const nextIndex = (currentIndex + 1) % espectaculos.length;
      updateFichaModalContent(espectaculos[nextIndex]); // Llamada recursiva controlada
    });

    fichaModalControls.appendChild(btnAnterior);
    fichaModalControls.appendChild(btnSiguiente);
  }
}

// Función para mostrar la modal de ficha
function showFichaModal(espectaculo) {
  if (!fichaModal) {
    console.error("Elemento modal de ficha no encontrado.");
    return;
  }
  updateFichaModalContent(espectaculo);
  fichaModal.classList.remove('hidden');
}

// Función para manejar la acción de votar/desvotar
async function handleVoteAction(espectaculo, cardElement, votarButton, currentUserForAction) {
  if (!currentUserForAction) {
    console.log("Intento de votar sin usuario para la acción.");
    if (loginModal) loginModal.classList.remove('hidden');
    return;
  }
  console.log(`--- CLICK EN VOTAR PARA: "${espectaculo.titulo}" por usuario: ${currentUserForAction.id} ---`);
  votarButton.disabled = true; // Deshabilitar botón mientras se procesa

  // 1. CONSULTAR ESTADO ACTUAL DE VOTOS DE LA DB
  const { data: votosActualesDesdeDB, error: errorConsulta } = await client
    .from('votos')
    .select('espectaculo')
    .eq('user_id', currentUserForAction.id);

  if (errorConsulta) {
    console.error("Error al consultar votos desde DB:", errorConsulta);
    alert(translations[currentLang].errorConsultVotes);
    votarButton.disabled = false;
    return;
  }

  votosGlobalesDelUsuario = Array.isArray(votosActualesDesdeDB) ? [...votosActualesDesdeDB] : [];
  console.log("Votos globales actualizados desde DB:", JSON.stringify(votosGlobalesDelUsuario));

  const espectaculoRealmenteVotadoAhora = votosGlobalesDelUsuario.some(v => v.espectaculo === espectaculo.titulo);
  console.log(`"${espectaculo.titulo}" está realmente votado (según DB ahora): ${espectaculoRealmenteVotadoAhora}`);

  if (espectaculoRealmenteVotadoAhora) {
    // ACCIÓN: DESVOTAR
    console.log("Intentando DESVOTAR");
    const { error: errorDelete } = await client
      .from('votos')
      .delete()
      .match({ user_id: currentUserForAction.id, espectaculo: espectaculo.titulo });

    if (!errorDelete) {
      console.log("Desvoto exitoso en DB");
      cardElement.classList.remove('votada');
      votarButton.textContent = translations[currentLang].votar;
      votosGlobalesDelUsuario = votosGlobalesDelUsuario.filter(v => v.espectaculo !== espectaculo.titulo);
      console.log("Votos globales después de desvotar:", JSON.stringify(votosGlobalesDelUsuario));
    } else {
      console.error("Error al eliminar voto en DB:", errorDelete);
      alert(translations[currentLang].errorDeleteVote);
    }
  } else {
    // ACCIÓN: VOTAR
    console.log("Intentando VOTAR");
    if (votosGlobalesDelUsuario.length < 10) {
      console.log("Límite no alcanzado, insertando voto...");
      const { data: insertData, error: errorInsert } = await client
        .from('votos')
        .insert([{ user_id: currentUserForAction.id, espectaculo: espectaculo.titulo }])
        .select();

      if (!errorInsert && insertData && insertData.length > 0) {
        console.log("Voto insertado exitosamente en DB:", insertData);
        cardElement.classList.add('votada');
        votarButton.textContent = translations[currentLang].desvotar;
        votosGlobalesDelUsuario.push({ espectaculo: espectaculo.titulo });
        console.log("Votos globales después de votar:", JSON.stringify(votosGlobalesDelUsuario));
      } else {
        console.error("Error al insertar voto en DB. Error:", errorInsert, "Data:", insertData);
        alert(translations[currentLang].errorRegisterVote);
      }
    } else {
      console.log("Límite de 10 votos alcanzado.");
      alert(translations[currentLang].limit10Votes);
    }
  }
  votarButton.disabled = false; // Rehabilitar botón
}


function renderCards(data, currentUser, votosInicialesDelUsuario) {
  if (!cardContainer) {
    console.error("Element with ID 'card-container' not found.");
    return;
  }
  cardContainer.innerHTML = '';
  console.log("Renderizando tarjetas. Datos:", data.length, "currentUser:", currentUser ? currentUser.id : "null");
  espectaculos = data; // Actualizar la lista global de espectáculos

  votosGlobalesDelUsuario = Array.isArray(votosInicialesDelUsuario) ? [...votosInicialesDelUsuario] : [];
  console.log("Votos Globales al inicio de renderCards:", JSON.stringify(votosGlobalesDelUsuario));

  data.forEach(espectaculo => {
    const card = document.createElement('div');
    card.classList.add('card');

    const yaVotadoAlRenderizar = currentUser && votosGlobalesDelUsuario.some(v => v.espectaculo === espectaculo.titulo);
    if (yaVotadoAlRenderizar) {
      card.classList.add('votada');
    }

    card.innerHTML = `
      <img data-src="${espectaculo.thumbnail}" alt="${espectaculo.titulo}" class="lazy-img" />
      <div class="card-content">
        <h3>${espectaculo.titulo}</h3>
        <p>${espectaculo.compania}</p>
      </div>
      <div class="actions">
        <button class="card-button ficha">${translations[currentLang].ficha}</button>
        <button class="card-button votar">${yaVotadoAlRenderizar ? translations[currentLang].desvotar : translations[currentLang].votar}</button>
      </div>
    `;

    const fichaButton = card.querySelector('.ficha');
    if (fichaButton) {
      fichaButton.addEventListener('click', () => showFichaModal(espectaculo));
    }

    const votarButton = card.querySelector('.votar');
    if (votarButton) {
      votarButton.addEventListener('click', () => handleVoteAction(espectaculo, card, votarButton, user)); // Usar 'user' (global actualizada)
    }
    cardContainer.appendChild(card);
  });

  // Lazy loading de imágenes con IntersectionObserver
  const lazyImages = document.querySelectorAll('img.lazy-img');
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.remove('lazy-img');
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '0px 0px 140px 0px', threshold: 0.1 });
  lazyImages.forEach(img => observer.observe(img));
}

function traducirUICompleta() {
  // Cabecera
  if (headerTitleElement) headerTitleElement.textContent = translations[currentLang].festivalTitle;
  if (headerPElement) headerPElement.textContent = translations[currentLang].votePrompt;

  // Modal de Login
  const loginTitle = loginModal ? loginModal.querySelector('h2') : null;
  const loginLabel = loginForm ? loginForm.querySelector('label[for="login-email"]') : null;
  if (loginTitle) loginTitle.textContent = translations[currentLang].loginTitle;
  if (loginLabel) loginLabel.textContent = translations[currentLang].loginEmailLabel;
  if (loginSubmitButton) loginSubmitButton.textContent = translations[currentLang].loginSendLink; // Se actualiza a "Enviando..." durante el envío
  if (loginCancelButton) loginCancelButton.textContent = translations[currentLang].loginCancel;

  // Aviso legal
  if (legalTextElement) legalTextElement.innerHTML = translations[currentLang].legalText;

  // Botones en tarjetas ya renderizadas
  document.querySelectorAll('.card').forEach(card => {
    const votarBtn = card.querySelector('.votar');
    const fichaBtn = card.querySelector('.ficha');
    const estaVotada = card.classList.contains('votada');
    if (votarBtn) votarBtn.textContent = estaVotada ? translations[currentLang].desvotar : translations[currentLang].votar;
    if (fichaBtn) fichaBtn.textContent = translations[currentLang].ficha;
  });

  // Texto del botón logout si el usuario está logueado
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.textContent = translations[currentLang].logout;

  // Textos en la modal de ficha (si está abierta)
  if (fichaModal && !fichaModal.classList.contains('hidden')) {
    const titulo = fichaModalTitle.textContent; // Usar el título actual para encontrar el espectáculo
    const espectaculoAbierto = espectaculos.find(e => e.titulo === titulo);
    if (espectaculoAbierto) {
        updateFichaModalContent(espectaculoAbierto); // Re-renderiza contenido de modal con nuevo idioma
    }
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  // Cachear elementos del DOM
  cardContainer = document.getElementById('card-container');
  fichaModal = document.getElementById('modal');
  fichaModalVideo = document.getElementById('modal-video');
  fichaModalTitle = document.getElementById('modal-title');
  fichaModalCompany = document.getElementById('modal-company');
  fichaModalYear = document.getElementById('modal-year');
  fichaModalSynopsis = document.getElementById('modal-synopsis');
  fichaModalControls = document.getElementById('modal-controls');
  fichaModalCloseButton = document.getElementById('modal-close');

  loginModal = document.getElementById('login-modal');
  loginForm = document.getElementById('login-form');
  loginCancelButton = document.getElementById('login-cancel');
  loginEmailInput = document.getElementById('login-email');
  loginMessageElement = document.getElementById('login-message');
  loginSubmitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

  userInfoElement = document.getElementById('user-info');
  headerTitleElement = document.querySelector('header h1');
  headerPElement = document.querySelector('header p');
  parallaxBgElement = document.querySelector('.parallax-bg');
  legalTextElement = document.getElementById('login-legal-text');

  // --- Comprobación de sesión y renderizado inicial ---
  const { data: { session } } = await client.auth.getSession();
  user = session?.user || null;

  if (user) {
    let userVotes = [];
    const { data: votosRecientes, error: errorVotos } = await client
      .from('votos')
      .select('espectaculo')
      .eq('user_id', user.id);
    if (errorVotos) console.error("Error fetching user votes on load:", errorVotos);
    else userVotes = Array.isArray(votosRecientes) ? [...votosRecientes] : [];
    votosGlobalesDelUsuario = userVotes;

    try {
      const res = await fetch('data/espectaculos.json');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      renderCards(data, user, votosGlobalesDelUsuario);
    } catch (fetchError) {
      console.error("Error fetching espectaculos.json:", fetchError);
      if(cardContainer) cardContainer.innerHTML = "<p>Error al cargar los espectáculos. Inténtalo de nuevo más tarde.</p>";
    }
  } else if (cardContainer) {
    cardContainer.innerHTML = '';
  }

  // Efecto Parallax
  if (parallaxBgElement) {
    window.addEventListener('scroll', () => {
      const offset = window.scrollY * 0.5;
      parallaxBgElement.style.transform = `translateY(${offset}px)`;
    });
  }

  // Aplicar traducciones iniciales
  traducirUICompleta();

  // --- Event Listeners ---

  // Modal de Login
  if (loginCancelButton && loginModal) {
    loginCancelButton.addEventListener('click', () => loginModal.classList.add('hidden'));
  }

  if (loginForm && loginEmailInput && loginMessageElement && loginSubmitButton) {
    let isSubmittingLogin = false;
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmittingLogin) return;

      isSubmittingLogin = true;
      loginSubmitButton.disabled = true;
      const originalLoginBtnText = loginSubmitButton.textContent; // Guardar texto original basado en idioma actual
      loginSubmitButton.textContent = translations[currentLang].loginSending;
      loginMessageElement.textContent = '';
      const email = loginEmailInput.value;

      if (!esEmailValido(email)) {
        loginMessageElement.textContent = translations[currentLang].loginErrorFormat;
        isSubmittingLogin = false;
        loginSubmitButton.disabled = false;
        loginSubmitButton.textContent = originalLoginBtnText; // Restaurar texto original
        return;
      }

      console.log("VALOR EXACTO DE redirectTo ENVIADO A SUPABASE:", redirectTo);
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo } // Supabase recomienda emailRedirectTo
      });

      if (error) {
        console.error("Error signInWithOtp:", error);
        loginMessageElement.textContent = translations[currentLang].loginErrorSend;
      } else {
        loginMessageElement.textContent = translations[currentLang].loginSuccess;
      }
      loginSubmitButton.disabled = false;
      loginSubmitButton.textContent = originalLoginBtnText; // Restaurar texto original
      isSubmittingLogin = false;
    });
  }

  // Modal de Ficha
  if (fichaModal && fichaModalCloseButton && fichaModalVideo) {
    fichaModalCloseButton.addEventListener('click', () => {
      fichaModal.classList.add('hidden');
      fichaModalVideo.innerHTML = ''; // Limpiar video para detener reproducción
    });
    fichaModal.addEventListener('click', (e) => { // Cerrar al hacer clic fuera
      if (e.target === fichaModal) {
        fichaModal.classList.add('hidden');
        fichaModalVideo.innerHTML = '';
      }
    });
  }
  document.addEventListener('keydown', (e) => { // Cerrar con tecla Escape
    if (e.key === 'Escape' && fichaModal && !fichaModal.classList.contains('hidden')) {
      fichaModal.classList.add('hidden');
      if (fichaModalVideo) fichaModalVideo.innerHTML = '';
    }
  });

  // Botones de Idioma
  const langButtons = document.querySelectorAll('.lang-btn');
  if (langButtons.length > 0) {
    langButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        localStorage.setItem('lang', currentLang);
        traducirUICompleta(); // Traducir toda la UI
        langButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    // Activar botón de idioma guardado
    const activeLangBtn = document.querySelector(`.lang-btn[data-lang="${currentLang}"]`);
    if (activeLangBtn) activeLangBtn.classList.add('active');
  }

  // Autenticación Supabase
  client.auth.onAuthStateChange(async (event, session) => {
    console.log("--- onAuthStateChange TRIGGERED --- Event:", event, "Session:", session ? session.user.email : "null");
    const previousUser = user;
    user = session?.user || null;

    if (userInfoElement) {
      if (user) {
        console.log("User identified:", user.email);
        if (loginModal) loginModal.classList.add('hidden');
        userInfoElement.innerHTML = `
          ${user.email}
          <button id="logout-btn">${translations[currentLang].logout}</button>
        `;
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', async () => {
            await client.auth.signOut();
            window.location.reload();
          });
        }
      } else {
        console.log("User is NOT identified (logged out or initial state)");
        userInfoElement.innerHTML = '';
      }
    }

    // Cargar o recargar datos solo si el estado del usuario cambia significativamente o es carga inicial
    const userChanged = (!previousUser && user) || (previousUser && !user) || (previousUser && user && previousUser.id !== user.id);
    if (userChanged || event === 'INITIAL_SESSION' || event === "SIGNED_IN") { // Añadido SIGNED_IN para refrescar tras login
      let userVotes = [];
      if (user) {
        const { data: votosRecientes, error: errorVotos } = await client
          .from('votos')
          .select('espectaculo')
          .eq('user_id', user.id);
        if (errorVotos) console.error("Error fetching user votes on auth change:", errorVotos);
        else userVotes = Array.isArray(votosRecientes) ? [...votosRecientes] : [];
      }
      votosGlobalesDelUsuario = userVotes; // Actualizar global

      try {
        const res = await fetch('data/espectaculos.json');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        renderCards(data, user, votosGlobalesDelUsuario); // Pasar el usuario actual y sus votos
      } catch (fetchError) {
        console.error("Error fetching espectaculos.json:", fetchError);
        if(cardContainer) cardContainer.innerHTML = "<p>Error al cargar los espectáculos. Inténtalo de nuevo más tarde.</p>";
      }
    }
  });
});