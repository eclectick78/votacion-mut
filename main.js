// --- main.js (VERSIÓN ANTIGUA MODIFICADA) ---

const SUPABASE_URL = 'https://fzxxnyeqeymabouuwhnt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eHhueWVxZXltYWJvdXV3aG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTcxMDcsImV4cCI6MjA2Mjk3MzEwN30.AcqmES6E_PJL5KNDcDHRq4ONyu2RWvgbeMkCPqcC2yk';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.');
const redirectTo = isLocalhost
  ? 'http://localhost:5500'
  : 'https://eclectick78.github.io/votacion-mut/';

console.log("Antes de crear cliente Supabase. window.supabase es:", window.supabase);
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Cliente Supabase creado:", client);

let user = null; // Variable global para el usuario
let espectaculos = []; // Variable global para los espectáculos
let currentLang = localStorage.getItem('lang') || 'va';
let votosGlobalesDelUsuario = []; // CAMBIO: Renombrar para claridad y usar esta globalmente

function getYouTubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
  return match ? match[1] : '';
}

function renderCards(data, currentUser, votosInicialesDelUsuario) { // currentUser es el usuario logueado
  const container = document.getElementById('card-container');
  if (!container) {
    console.error("Element with ID 'card-container' not found.");
    return;
  }
  container.innerHTML = '';
  console.log("Renderizando tarjetas. Datos:", data.length, "currentUser:", currentUser ? currentUser.id : "null");
  espectaculos = data;

  // Sincronizar el array GLOBAL con los votos que vienen de onAuthStateChange o carga inicial
  votosGlobalesDelUsuario = Array.isArray(votosInicialesDelUsuario) ? [...votosInicialesDelUsuario] : [];
  console.log("Votos Globales al inicio de renderCards:", JSON.stringify(votosGlobalesDelUsuario));

  data.forEach(espectaculo => {
    const card = document.createElement('div');
    card.classList.add('card');

    // Determinar si ya está votado USANDO EL ARRAY GLOBAL
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
        <button class="card-button ficha">${currentLang === 'es' ? 'Ficha' : 'Fitxa'}</button>
        <button class="card-button votar">${yaVotadoAlRenderizar ? (currentLang === 'es' ? 'Desvotar' : 'Desvotar') : (currentLang === 'es' ? 'Votar' : 'Votar')}</button>
      </div>
    `;

    const fichaButton = card.querySelector('.ficha');
    if (fichaButton) {
      fichaButton.addEventListener('click', () => {
        const modal = document.getElementById('modal');
        const modalVideo = document.getElementById('modal-video');
        const modalTitle = document.getElementById('modal-title');
        const modalCompany = document.getElementById('modal-company');
        const modalYear = document.getElementById('modal-year');
        const modalSynopsis = document.getElementById('modal-synopsis');

        if (!modal || !modalVideo || !modalTitle || !modalCompany || !modalYear || !modalSynopsis) {
          console.error("Algún elemento de la modal no fue encontrado");
          return;
        }

        const videoId = getYouTubeId(espectaculo.video);
        modalVideo.innerHTML = videoId
          ? `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`
          : '<p>Vídeo no disponible.</p>';

        modalTitle.textContent = espectaculo.titulo;
        modalCompany.textContent = espectaculo.compania;
        modalYear.textContent = espectaculo.anio;
        modalSynopsis.textContent =
          currentLang === 'es' ? espectaculo.sinopsis_es : espectaculo.sinopsis_val;

        modal.classList.remove('hidden');
      });
    }

    // ... lógica del botón ficha sin cambios ...

    const votarButton = card.querySelector('.votar');
    if (votarButton) {
      // PASAR currentUser al listener para que sepa quién es el usuario EN EL MOMENTO DEL RENDER
      // No lo pasamos como parámetro al listener, sino que el listener lo tomará del scope de renderCards
      votarButton.addEventListener('click', async () => {
        // USAR 'user' (la variable global) O 'currentUser' del scope de renderCards
        // Es importante que sea el usuario correcto en este punto.
        const usuarioParaAccion = user; // o currentUser si prefieres la copia del momento del render

        if (!usuarioParaAccion) {
          console.log("Intento de votar sin usuario para la acción.");
          const loginModal = document.getElementById('login-modal');
          if (loginModal) loginModal.classList.remove('hidden');
          return;
        }
        console.log(`--- CLICK EN VOTAR PARA: "${espectaculo.titulo}" por usuario: ${usuarioParaAccion.id} ---`);

        // 1. CONSULTAR ESTADO ACTUAL DE VOTOS DE LA DB PARA ASEGURAR CONSISTENCIA
        //    Esto es importante para evitar condiciones de carrera si el estado local está desactualizado.
        const { data: votosActualesDesdeDB, error: errorConsulta } = await client
          .from('votos')
          .select('espectaculo')
          .eq('user_id', usuarioParaAccion.id);

        if (errorConsulta) {
          console.error("Error al consultar votos desde DB:", errorConsulta);
          alert(currentLang === 'es' ? "Error al consultar tus votos. Inténtalo de nuevo." : "Error en consultar els teus vots. Torna-ho a intentar.");
          return;
        }

        // Actualizar nuestro array global con la info más fresca
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
            .match({ user_id: usuarioParaAccion.id, espectaculo: espectaculo.titulo }); // Usar match para mayor precisión

          if (!errorDelete) {
            console.log("Desvoto exitoso en DB");
            card.classList.remove('votada'); // QUITAR BORDE
            votarButton.textContent = currentLang === 'es' ? 'Votar' : 'Votar';
            // Actualizar el array GLOBAL de votos
            votosGlobalesDelUsuario = votosGlobalesDelUsuario.filter(v => v.espectaculo !== espectaculo.titulo);
            console.log("Votos globales después de desvotar:", JSON.stringify(votosGlobalesDelUsuario));
          } else {
            console.error("Error al eliminar voto en DB:", errorDelete);
            // Aquí podrías mostrar el mensaje de error para depurar si la RLS de DELETE está fallando
            alert(currentLang === 'es' ? "No se ha podido borrar el voto." : "No s'ha pogut esborrar el vot.");
          }
        } else {
          // ACCIÓN: VOTAR
          console.log("Intentando VOTAR");
          // Verificar límite USANDO EL ARRAY GLOBAL ACTUALIZADO
          if (votosGlobalesDelUsuario.length < 10) {
            console.log("Límite no alcanzado, insertando voto...");
            const { data: insertData, error: errorInsert } = await client
              .from('votos')
              .insert([{ user_id: usuarioParaAccion.id, espectaculo: espectaculo.titulo }])
              .select(); // Añadir .select() para obtener datos de vuelta y confirmar

            if (!errorInsert && insertData && insertData.length > 0) {
              console.log("Voto insertado exitosamente en DB:", insertData);
              card.classList.add('votada'); // AÑADIR BORDE
              votarButton.textContent = currentLang === 'es' ? 'Desvotar' : 'Desvotar';
              // Actualizar el array GLOBAL de votos
              votosGlobalesDelUsuario.push({ espectaculo: espectaculo.titulo }); // Asegurar que tenga la misma estructura si es necesario
              console.log("Votos globales después de votar:", JSON.stringify(votosGlobalesDelUsuario));
            } else {
              console.error("Error al insertar voto en DB. Error:", errorInsert, "Data:", insertData);
              // ESTE ES EL ERROR QUE PROBABLEMENTE SIGUES VIENDO DEBIDO A RLS
              alert(currentLang === 'es' ? "No se ha podido registrar el voto." : "No s'ha pogut registrar el vot.");
            }
          } else {
            console.log("Límite de 10 votos alcanzado.");
            alert(currentLang === 'es' ? "Ya has votado 10 espectáculos." : "Ja has votat 10 espectacles.");
          }
        }
      });
    }
    container.appendChild(card);
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
  }, {
    rootMargin: '0px 0px 100px 0px',
    threshold: 0.1
  });

  lazyImages.forEach(img => observer.observe(img));
}

// ... (resto del document.addEventListener('DOMContentLoaded') y onAuthStateChange)
// ej. renderCards(data, user, votosDelUsuarioObtenidosDeLaDB || []);

document.addEventListener('DOMContentLoaded', () => {
  const h1 = document.querySelector('header h1');
  const p = document.querySelector('header p');
  const bg = document.querySelector('.parallax-bg');

  if (bg) { // Verificar que bg exista
    window.addEventListener('scroll', () => {
      const offset = window.scrollY * 0.5;
      bg.style.transform = `translateY(${offset}px)`;
    });
  }

  function traducirCabecera() {
    const h1 = document.querySelector('header h1');
    const p = document.querySelector('header p');
    if (currentLang === 'es') {
      h1.textContent = 'Festival MUT! 10 años';
      p.textContent = 'Vota tus 10 espectáculos preferidos';
    } else {
      h1.textContent = 'Festival MUT! 10 anys';
      p.textContent = 'Vota els teus 10 espectacles preferits';
    }
  }
  function traducirLoginModal() {
    const loginTitle = document.querySelector('#login-modal h2');
    const loginLabel = document.querySelector('#login-form label[for="login-email"]');
    const loginButton = document.querySelector('#login-form button[type="submit"]');
    const cancelButton = document.getElementById('login-cancel');

    if (currentLang === 'es') {
      loginTitle.textContent = 'Inicia sesión para votar';
      loginLabel.textContent = 'Correo electrónico:';
      loginButton.textContent = 'Enviar enlace';
      cancelButton.textContent = 'Cancelar';
    } else {
      loginTitle.textContent = 'Inicia sessió per votar';
      loginLabel.textContent = 'Email:';
      loginButton.textContent = 'Enviar enllaç';
      cancelButton.textContent = 'Cancelar';
    }
  }

  traducirCabecera();
  traducirLoginModal();

  const loginForm = document.getElementById('login-form');
  const loginModal = document.getElementById('login-modal');
  const cancelBtn = document.getElementById('login-cancel');

  if (cancelBtn && loginModal) {
    cancelBtn.addEventListener('click', () => {
      loginModal.classList.add('hidden');
    });
  }

  const modal = document.getElementById('modal');
  const modalCloseButton = document.getElementById('modal-close');
  const modalVideo = document.getElementById('modal-video');
  const langButtons = document.querySelectorAll('.lang-btn');

  if (loginForm) {
    // Modificación para que el botón de login dé feedback de "Enviando..."
    let isSubmittingLogin = false;
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmittingLogin) return;

      const emailInput = document.getElementById('login-email');
      const msg = document.getElementById('login-message');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!emailInput || !msg || !submitBtn) {
        console.error("Login form elements not found");
        return;
      }

      isSubmittingLogin = true;
      submitBtn.disabled = true;
      const originalLoginBtnText = submitBtn.textContent;
      submitBtn.textContent = currentLang === 'es' ? 'Enviando...' : 'Enviant...';
      msg.textContent = '';

      const email = emailInput.value;
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          redirectTo: redirectTo
        }
      });

      if (error) {
        msg.textContent = currentLang === 'es' ? 'Error al enviar el correo. Inténtalo de nuevo.' : 'Error en enviar el correu. Torna-ho a intentar.';
      } else {
        msg.textContent = currentLang === 'es' ? 'Revisa tu correo para continuar.' : 'Revisa el teu correu per continuar.';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = originalLoginBtnText;
      isSubmittingLogin = false;
    });
  }

  // Listener para cerrar la modal de la ficha correctamente al pulsar el botón ✕
  if (modal && modalCloseButton && modalVideo) {
    modalCloseButton.addEventListener('click', () => {
      modal.classList.add('hidden');
      modalVideo.innerHTML = '';
    });
  }
  // Permitir cerrar la modal haciendo clic fuera del contenido
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        if (modalVideo) modalVideo.innerHTML = '';
      }
    });
  }
  // Listener para cerrar la modal de ficha al pulsar la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
      modalVideo.innerHTML = '';
    }
  });
  // BLOQUE DE LÓGICA DE BOTONES DE IDIOMA
  if (langButtons.length > 0) {
    langButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        localStorage.setItem('lang', currentLang);
        traducirCabecera();
        traducirLoginModal();

        langButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Actualizar sinopsis si modal está abierta
        const modal = document.getElementById('modal');
        if (!modal.classList.contains('hidden')) {
          const titulo = document.getElementById('modal-title').textContent;
          const espectaculo = espectaculos.find(e => e.titulo === titulo);
          if (espectaculo) {
            document.getElementById('modal-synopsis').textContent =
              currentLang === 'es' ? espectaculo.sinopsis_es : espectaculo.sinopsis_val;
          }
        }

        // Actualizar texto de botones ficha/votar ya renderizados
        document.querySelectorAll('.card').forEach(card => {
          const votarBtn = card.querySelector('.votar');
          const fichaBtn = card.querySelector('.ficha');
          const estaVotada = card.classList.contains('votada');
          if (votarBtn) votarBtn.textContent = estaVotada ? (currentLang === 'es' ? 'Desvotar' : 'Desvotar') : (currentLang === 'es' ? 'Votar' : 'Votar');
          if (fichaBtn) fichaBtn.textContent = currentLang === 'es' ? 'Ficha' : 'Fitxa';
        });
      });
    });
  }

  // client.auth.getSession().then(...) // Es buena idea tener esto para el estado inicial

  client.auth.onAuthStateChange(async (event, session) => {
    console.log("--- onAuthStateChange TRIGGERED --- Event:", event, "Session:", session ? session.user.email : "null");
    const previousUser = user; // Guardar el usuario anterior para comparar
    user = session?.user || null; // Actualizar la variable global 'user'

    // Actualizar UI de info de usuario
    const userInfo = document.getElementById('user-info');
    if (user) {
      console.log("User identified:", user.email);
      if (loginModal) loginModal.classList.add('hidden');
      if (userInfo) {
        userInfo.innerHTML = `
              ${user.email}
              <button id="logout-btn">${currentLang === 'es' ? 'Cerrar sesión' : 'Tancar sessió'}</button>
            `;
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', async () => {
            await client.auth.signOut();
          });
        }
      }
    } else {
      console.log("User is NOT identified (logged out or initial state)");
      if (userInfo) userInfo.innerHTML = '';
    }


    // Cargar o recargar datos de espectáculos y votos
    // Solo si el usuario ha cambiado realmente o es la carga inicial tras login
    if ((!previousUser && user) || (previousUser && !user) || (previousUser && user && previousUser.id !== user.id) || event === 'INITIAL_SESSION') {
      if (user) {
        // Usuario logueado
        const { data: votosRecientes, error: errorVotos } = await client
          .from('votos')
          .select('espectaculo')
          .eq('user_id', user.id);
        if (errorVotos) console.error("Error fetching user votes on auth change:", errorVotos);

        votosGlobalesDelUsuario = Array.isArray(votosRecientes) ? [...votosRecientes] : []; // Actualizar global

        try {
          const res = await fetch('data/espectaculos.json');
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          renderCards(data, user, votosGlobalesDelUsuario); // Pasar el usuario y sus votos globales
        } catch (fetchError) {
          // ... manejo de error de fetch ...
        }
      } else {
        // Usuario no logueado
        votosGlobalesDelUsuario = []; // Limpiar votos globales
        try {
          const res = await fetch('data/espectaculos.json');
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          renderCards(data, null, []); // Sin usuario, sin votos
        } catch (fetchError) {
          // ... manejo de error de fetch ...
        }
      }
    }

    // Activar botón de idioma
    if (langButtons.length > 0) {
      langButtons.forEach(b => b.classList.remove('active'));
      const activeBtn = document.querySelector(`.lang-btn[data-lang="${currentLang}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    }
  });
});