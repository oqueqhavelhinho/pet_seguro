const TOTAL_STEPS = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_IMAGE_DIMENSION = 300;
const { jsPDF } = window.jspdf;

let state = {
    form: {},
    pets: JSON.parse(localStorage.getItem('pets')) || [],
    currentStep: 1,
    editingIndex: null,
    selectedSpecies: '',
    points: JSON.parse(localStorage.getItem('points')) || 0
};

const dogBreeds = ["Vira-Lata (SRD)", "Não sei", "Outra", "Afghan Hound", "Yorkshire"];
const catBreeds = ["Vira-Lata (SRD)", "Não sei", "Outra", "Abissínio", "Van Turco"];

const dailyChallenges = [
    { id: 'registerPet', description: 'Cadastre um novo pet hoje', points: 10, completed: false },
    { id: 'editPet', description: 'Edite o perfil de um pet', points: 5, completed: false },
    { id: 'exportPets', description: 'Exporte sua lista de pets', points: 5, completed: false },
    { id: 'viewDetails', description: 'Visualize os detalhes de 3 pets', points: 8, progress: 0, max: 3 },
    { id: 'addDescription', description: 'Adicione uma descrição a um pet', points: 6, completed: false }
];

// Função de debounce para otimizar eventos como busca
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Exibe mensagens toast
function showToast(message, type = 'success', isAchievement = false, duration = 4000) {
    const toast = document.getElementById('toast');
    if (isAchievement) {
        toast.innerHTML = `<i class="fas fa-trophy"></i><span>${message} 🐶😺</span>`;
    } else {
        toast.innerHTML = message;
    }
    toast.className = `toast ${type} visible ${isAchievement ? 'achievement' : ''}`;
    setTimeout(() => {
        toast.classList.remove('visible');
        if (!isAchievement) enableSuccessButtons();
    }, duration);
}

// Habilita botões no success-message
function enableSuccessButtons() {
    const viewPetsBtn = document.getElementById('view-pets-btn');
    const addAnotherBtn = document.getElementById('add-another-btn');
    viewPetsBtn.disabled = false;
    viewPetsBtn.style.pointerEvents = 'auto';
    viewPetsBtn.style.opacity = '1';
    addAnotherBtn.disabled = false;
    addAnotherBtn.style.pointerEvents = 'auto';
    addAnotherBtn.style.opacity = '1';
}

// Atualiza os pontos e níveis
function updatePoints(pointsToAdd, isAchievement = false) {
    state.points += pointsToAdd;
    if (state.points < 0) state.points = 0;
    localStorage.setItem('points', JSON.stringify(state.points));

    const levels = [
        { name: 'Iniciante', min: 0, max: 49, icon: 'fa-star' },
        { name: 'Cuidador', min: 50, max: 149, icon: 'fa-medal' },
        { name: 'Amigo dos Pets', min: 150, max: 299, icon: 'fa-heart' },
        { name: 'Guardião Peludo', min: 300, max: 499, icon: 'fa-shield-alt' },
        { name: 'Mestre dos Pets', min: 500, max: 999, icon: 'fa-crown' },
        { name: 'Lenda dos Bichos', min: 1000, max: 1499, icon: 'fa-trophy' },
        { name: 'Protetor Animal', min: 1500, max: 2499, icon: 'fa-paw' },
        { name: 'Herói dos Pets', min: 2500, max: 3999, icon: 'fa-superpowers' },
        { name: 'Salvador Peludo', min: 4000, max: 5999, icon: 'fa-rocket' },
        { name: 'Divindade Pet', min: 6000, max: Infinity, icon: 'fa-gem' }
    ];
    const currentLevel = levels.find(level => state.points >= level.min && state.points <= level.max);
    const nextLevel = levels[levels.indexOf(currentLevel) + 1] || currentLevel;
    const progressPercentage = currentLevel.max === Infinity ? 100 : ((state.points - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;

    document.getElementById('menu-points').textContent = `${state.points} Patinhas`;
    document.getElementById('menu-level').textContent = currentLevel.name;
    document.getElementById('menu-level-icon').className = `fas ${currentLevel.icon} text-xl mr-2`;

    const pointsText = document.getElementById('points-text');
    const levelText = document.getElementById('level-text');
    const levelIcon = document.getElementById('level-icon');
    const levelProgress = document.getElementById('level-progress');
    const progressInfo = document.getElementById('progress-info');
    if (pointsText) pointsText.textContent = `${state.points} Patinhas`;
    if (levelText) levelText.textContent = currentLevel.name;
    if (levelIcon) levelIcon.className = `fas ${currentLevel.icon} text-2xl mr-2`;
    if (levelProgress) levelProgress.style.width = `${progressPercentage}%`;
    if (progressInfo) progressInfo.textContent = nextLevel.max === Infinity 
        ? 'Nível máximo alcançado!' 
        : `${state.points}/${nextLevel.min} até ${nextLevel.name}`;

    let tooltip = document.querySelector('.level-tooltip');
    if (!tooltip && document.querySelector('.level-info-icon')) {
        tooltip = document.createElement('div');
        tooltip.className = 'level-tooltip';
        document.querySelector('.level-info-icon').appendChild(tooltip);
    }
    if (tooltip) {
        tooltip.textContent = `Nível: ${currentLevel.name} - Patinhas: ${state.points} - Próximo nível: ${nextLevel.name} (${nextLevel.min} Patinhas)`;
    }

    const previousPoints = state.points - pointsToAdd;
    const previousLevel = levels.find(level => previousPoints >= level.min && previousPoints <= level.max);
    if (currentLevel !== previousLevel && pointsToAdd > 0) {
        showLevelUpAnimation(currentLevel.name);
    }

    if (pointsToAdd > 0 && !isAchievement) {
        showToast(`Você ganhou ${pointsToAdd} Patinhas pelo cadastro!`, 'success');
    } else if (pointsToAdd > 0 && isAchievement) {
        showToast(`Desafio concluído! +${pointsToAdd} Patinhas`, 'success', true);
    } else if (pointsToAdd < 0) {
        showToast(`Você perdeu ${Math.abs(pointsToAdd)} Patinhas.`, 'error');
    }
    applyTheme();
}

// Animação de subir de nível
function showLevelUpAnimation(levelName) {
    const animationDiv = document.createElement('div');
    animationDiv.className = 'level-up-animation';
    animationDiv.innerHTML = `<i class="fas fa-trophy" style="color: var(--achievement-color); font-size: 1.5rem;"></i> Novo nível: ${levelName}!`;
    document.body.appendChild(animationDiv);
    setTimeout(() => animationDiv.remove(), 2000);
}

// Aplica o tema
function applyTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.querySelectorAll('.gamification-card, .pet-card').forEach(el => {
        el.classList.toggle('dark-mode:bg-gray-700', isDarkMode);
    });
}

// Carrega desafios diários
function loadChallenges() {
    const today = new Date().toDateString();
    let challenges = JSON.parse(localStorage.getItem('dailyChallenges')) || { date: today, tasks: dailyChallenges };
    if (challenges.date !== today) {
        challenges = { date: today, tasks: dailyChallenges.map(task => ({ ...task, completed: false, progress: 0 })) };
    }
    localStorage.setItem('dailyChallenges', JSON.stringify(challenges));
    return challenges;
}

// Atualiza o progresso de um desafio
function updateChallenge(id, increment = 1) {
    const challenges = loadChallenges();
    const challenge = challenges.tasks.find(c => c.id === id);
    if (challenge && !challenge.completed) {
        if (challenge.max) {
            challenge.progress = Math.min(challenge.progress + increment, challenge.max);
            if (challenge.progress === challenge.max) {
                challenge.completed = true;
                updatePoints(challenge.points, true);
            }
        } else {
            challenge.completed = true;
            updatePoints(challenge.points, true);
        }
        localStorage.setItem('dailyChallenges', JSON.stringify(challenges));
        displayChallenges();
    }
}

// Exibe os desafios diários
function displayChallenges() {
    const challenges = loadChallenges();
    const list = document.getElementById('challenge-list');
    list.innerHTML = '';
    challenges.tasks.forEach(challenge => {
        const li = document.createElement('li');
        li.className = challenge.completed ? 'completed' : '';
        li.innerHTML = `${challenge.description} ${challenge.max ? `(${challenge.progress}/${challenge.max})` : ''} <span>${challenge.points} Patinhas</span>`;
        list.appendChild(li);
    });
}

// Alterna a exibição dos desafios
function toggleChallenges() {
    const challengesSection = document.getElementById('daily-challenges');
    const toggleBtn = document.getElementById('toggle-challenges');
    challengesSection.classList.toggle('collapsed');
    toggleBtn.classList.toggle('expanded');
    const challengeList = document.getElementById('challenge-list');
    if (!challengesSection.classList.contains('collapsed')) {
        challengeList.style.display = 'block';
    }
}

// Inicia o cadastro
function startRegistration() {
    state.form = {};
    state.currentStep = 1;
    state.editingIndex = null;
    document.getElementById('no-pet-message').classList.add('hidden');
    document.getElementById('pet-panel').classList.add('hidden');
    document.getElementById('success-message').classList.add('hidden');
    document.getElementById('summary-message').classList.add('hidden');
    document.getElementById('registration-form').classList.remove('hidden');
    resetForm();
    updateProgress();
    populateBreeds();
    populateYears();
    document.getElementById('pet-species').focus();
}

// Reseta o formulário
function resetForm() {
    document.getElementById('registration-form').reset();
    document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'));
    document.getElementById('step-1').classList.remove('hidden');
    document.querySelectorAll('.error-message').forEach(msg => msg.style.display = 'none');
    document.querySelectorAll('.required-field').forEach(field => field.classList.remove('required-field'));
    document.querySelectorAll('.btn-primary').forEach(btn => btn.classList.add('disabled'));
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('summary-image').classList.add('hidden');
    document.getElementById('other-breed-input').style.display = 'none';
    document.getElementById('other-color-input').style.display = 'none';
}

// Atualiza a barra de progresso
function updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const percentage = ((state.currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Etapa ${state.currentStep} de ${TOTAL_STEPS}`;
}

// Avança para a próxima etapa
function nextStep(step) {
    document.getElementById(`step-${state.currentStep}`).classList.add('hidden');
    state.currentStep = step;
    document.getElementById(`step-${step}`).classList.remove('hidden');
    updateProgress();
    const firstInput = document.getElementById(`step-${step}`).querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
}

// Volta para a etapa anterior
function prevStep(step) {
    document.getElementById(`step-${state.currentStep}`).classList.add('hidden');
    state.currentStep = step;
    document.getElementById(`step-${step}`).classList.remove('hidden');
    updateProgress();
}

// Valida os dados de cada etapa
function validateStep(step) {
    let isValid = true;
    const nextBtn = document.getElementById(`next-${step}`);
    switch (step) {
        case 1:
            const species = document.getElementById('pet-species').value;
            isValid = species !== '';
            toggleError('species-error', !isValid);
            state.form.species = species;
            break;
        case 2:
            const name = document.getElementById('pet-name').value.trim();
            isValid = name.length >= 2;
            toggleError('name-error', !isValid);
            state.form.name = name;
            state.form.description = document.getElementById('pet-description').value.trim();
            break;
        case 3:
            const gender = document.getElementById('pet-gender').value;
            isValid = gender !== '';
            toggleError('gender-error', !isValid);
            state.form.gender = gender;
            break;
        case 4:
            const breedSelect = document.getElementById('pet-breed');
            const otherBreed = document.getElementById('other-breed-input');
            const porte = document.querySelector('input[name="porte"]:checked');
            const breedValid = breedSelect.value === 'Outra' ? otherBreed.value.trim().length > 0 : breedSelect.value !== '';
            const porteValid = !!porte;
            isValid = breedValid && porteValid;
            toggleError('breed-error', !breedValid);
            toggleError('porte-error', !porteValid);
            state.form.breed = breedSelect.value === 'Outra' ? otherBreed.value.trim() : breedSelect.value;
            state.form.porte = porte ? porte.value : '';
            break;
        case 5:
            const castrado = document.querySelector('input[name="castrado"]:checked');
            isValid = !!castrado;
            toggleError('castrado-error', !isValid);
            state.form.castrado = castrado ? castrado.value : '';
            break;
        case 6:
            const birthYear = document.getElementById('pet-birth-year').value;
            isValid = birthYear !== '';
            toggleError('birth-year-error', !isValid);
            state.form.birthYear = birthYear;
            break;
        case 7:
            const colorSelect = document.getElementById('pet-color');
            const otherColor = document.getElementById('other-color-input');
            isValid = colorSelect.value === 'Outra' ? otherColor.value.trim().length > 0 : colorSelect.value !== '';
            toggleError('color-error', !isValid);
            state.form.color = colorSelect.value === 'Outra' ? otherColor.value.trim() : colorSelect.value;
            break;
        case 8:
            const image = document.getElementById('pet-image').files[0];
            isValid = !!image && image.size <= MAX_IMAGE_SIZE;
            toggleError('image-error', !isValid);
            break;
        case 9:
            const location = document.getElementById('pet-location').value.trim();
            isValid = location.length > 0;
            toggleError('location-error', !isValid);
            state.form.location = location;
            break;
        case 10:
            const contact = document.getElementById('pet-contact').value.replace(/\D/g, '');
            isValid = contact.length >= 10;
            toggleError('contact-error', !isValid);
            state.form.contact = document.getElementById('pet-contact').value;
            break;
    }
    nextBtn.classList.toggle('disabled', !isValid);
    nextBtn.setAttribute('aria-disabled', !isValid);
    return isValid;
}

// Exibe ou oculta mensagens de erro
function toggleError(errorId, show) {
    const error = document.getElementById(errorId);
    error.style.display = show ? 'block' : 'none';
    const field = error.previousElementSibling;
    if (field && (field.tagName === 'INPUT' || field.tagName === 'SELECT')) {
        field.classList.toggle('required-field', show);
    }
}

// Atualiza o ícone da espécie
function updateSpeciesIcon() {
    const species = document.getElementById('pet-species').value;
    const icon = document.getElementById('species-icon');
    const step2Icon = document.getElementById('step-2-icon');
    icon.className = `fas fa-${species === 'Cachorro' ? 'dog' : 'cat'} pet-icon`;
    step2Icon.className = `fas fa-${species === 'Cachorro' ? 'dog' : 'cat'} pet-icon`;
    state.selectedSpecies = species;
    populateBreeds();
}

// Preenche o select de raças
function populateBreeds() {
    const breedSelect = document.getElementById('pet-breed');
    breedSelect.innerHTML = '<option value="" selected disabled>Selecione a raça</option>';
    const breeds = state.selectedSpecies === 'Cachorro' ? dogBreeds : catBreeds;
    breeds.forEach(breed => {
        const option = document.createElement('option');
        option.value = breed;
        option.textContent = breed;
        if (['Vira-Lata (SRD)', 'Não sei'].includes(breed)) option.classList.add('common');
        breedSelect.appendChild(option);
    });
    if (state.form.breed) {
        breedSelect.value = breeds.includes(state.form.breed) ? state.form.breed : 'Outra';
        if (breedSelect.value === 'Outra') {
            document.getElementById('other-breed-input').value = state.form.breed;
            document.getElementById('other-breed-input').style.display = 'block';
        }
    }
}

// Exibe ou oculta o campo de raça personalizada
function toggleOtherBreedInput() {
    const breedSelect = document.getElementById('pet-breed');
    const otherInput = document.getElementById('other-breed-input');
    otherInput.style.display = breedSelect.value === 'Outra' ? 'block' : 'none';
    if (breedSelect.value !== 'Outra') otherInput.value = '';
    validateStep(4);
}

// Preenche o select de anos
function populateYears() {
    const yearSelect = document.getElementById('pet-birth-year');
    yearSelect.innerHTML = '<option value="" selected disabled>Selecione o ano</option>';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 20; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    if (state.form.birthYear) yearSelect.value = state.form.birthYear;
}

// Exibe ou oculta o campo de cor personalizada
function toggleOtherColorInput() {
    const colorSelect = document.getElementById('pet-color');
    const otherInput = document.getElementById('other-color-input');
    otherInput.style.display = colorSelect.value === 'Outra' ? 'block' : 'none';
    if (colorSelect.value !== 'Outra') otherInput.value = '';
    validateStep(7);
}

// Pré-visualiza a imagem
function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('image-preview');
    const loading = document.getElementById('image-loading');
    if (file) {
        loading.style.display = 'block';
        preview.classList.add('hidden');
        const img = new Image();
        img.onload = () => {
            if (img.width < MIN_IMAGE_DIMENSION || img.height < MIN_IMAGE_DIMENSION) {
                document.getElementById('image-error').style.display = 'block';
                document.getElementById('next-8').classList.add('disabled');
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    state.form.image = e.target.result;
                    preview.classList.remove('hidden');
                    loading.style.display = 'none';
                    validateStep(8);
                };
                reader.readAsDataURL(file);
            }
        };
        img.onerror = () => {
            loading.style.display = 'none';
            showToast('Erro ao carregar a imagem.', 'error');
        };
        img.src = URL.createObjectURL(file);
    }
}

// Máscara para o campo de telefone
function maskPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    input.value = value;
    validateStep(10);
}

// Exibe o resumo
function showSummary() {
    if (!validateStep(state.currentStep)) return;
    document.getElementById('registration-form').classList.add('hidden');
    document.getElementById('summary-message').classList.remove('hidden');
    const summaryImage = document.getElementById('summary-image');
    summaryImage.src = state.form.image;
    summaryImage.classList.remove('hidden');
    const content = document.getElementById('summary-content');
    content.innerHTML = `
        <strong>Espécie:</strong> ${state.form.species}
        <strong>Nome:</strong> ${state.form.name}
        ${state.form.description ? `<strong>Descrição:</strong> ${state.form.description}` : ''}
        <strong>Gênero:</strong> ${state.form.gender}
        <strong>Raça:</strong> ${state.form.breed}
        <strong>Porte:</strong> ${state.form.porte}
        <strong>Castrado:</strong> ${state.form.castrado}
        <strong>Ano de Nascimento/Adoção:</strong> ${state.form.birthYear}
        <strong>Cor:</strong> ${state.form.color}
        <strong>Bairro:</strong> ${state.form.location}
        <strong>Contato:</strong> ${state.form.contact}
    `;
}

// Volta ao formulário para edição
function editForm() {
    document.getElementById('summary-message').classList.add('hidden');
    document.getElementById('registration-form').classList.remove('hidden');
    populateBreeds();
    populateYears();
}

// Confirma o cadastro
function confirmRegistration() {
    if (state.editingIndex !== null) {
        state.pets[state.editingIndex] = { ...state.form };
        updateChallenge('editPet');
    } else {
        state.pets.push({ ...state.form });
        updateChallenge('registerPet');
        updatePoints(5);
    }
    localStorage.setItem('pets', JSON.stringify(state.pets));
    document.getElementById('summary-message').classList.add('hidden');
    document.getElementById('success-message').classList.remove('hidden');
    document.getElementById('success-title').textContent = `${state.form.name} foi cadastrado(a) com sucesso!`;
    const viewPetsBtn = document.getElementById('view-pets-btn');
    const addAnotherBtn = document.getElementById('add-another-btn');
    viewPetsBtn.disabled = true;
    viewPetsBtn.style.pointerEvents = 'none';
    viewPetsBtn.style.opacity = '0.5';
    addAnotherBtn.disabled = true;
    addAnotherBtn.style.pointerEvents = 'none';
    addAnotherBtn.style.opacity = '0.5';
}

// Cancela o cadastro
function cancelRegistration() {
    document.getElementById('registration-form').classList.add('hidden');
    if (state.pets.length > 0) {
        showPetPanel();
    } else {
        document.getElementById('no-pet-message').classList.remove('hidden');
    }
}

// Exibe o painel de pets
function showPetPanel() {
    document.getElementById('no-pet-message').classList.add('hidden');
    document.getElementById('registration-form').classList.add('hidden');
    document.getElementById('success-message').classList.add('hidden');
    document.getElementById('summary-message').classList.add('hidden');
    document.getElementById('pet-panel').classList.remove('hidden');
    displayPets();
    displayChallenges();
    updatePoints(0);
}

// Exibe a lista de pets
function displayPets(pets = state.pets) {
    const petList = document.getElementById('pet-list');
    petList.innerHTML = '';
    pets.forEach((pet, index) => {
        const card = document.createElement('div');
        card.className = 'pet-card bg-white dark-mode:bg-gray-700 rounded-lg shadow-md p-4';
        card.innerHTML = `
            <img src="${pet.image}" alt="${pet.name}" class="w-full object-cover rounded mb-2" loading="lazy">
            <h3 class="text-lg font-bold title-color">${pet.name}</h3>
            <p class="text-color">${pet.species} - ${pet.breed}</p>
            <p class="text-color">Porte: ${pet.porte}</p>
            <div class="button-group">
                <button onclick="viewPet(${index})" class="btn btn-primary" aria-label="Ver detalhes"><i class="fas fa-eye"></i></button>
                <button onclick="editPet(${index})" class="btn btn-primary" aria-label="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="deletePet(${index})" class="btn btn-danger" aria-label="Excluir"><i class="fas fa-trash"></i></button>
            </div>
        `;
        petList.appendChild(card);
    });
}

// Filtra e ordena os pets
function filterPets(sortBy = document.getElementById('sort-by').value) {
    let filteredPets = [...state.pets];
    const search = document.getElementById('pet-search').value.toLowerCase();
    const species = document.getElementById('pet-species-filter').value;
    const porte = document.getElementById('pet-porte-filter').value;
    const color = document.getElementById('pet-color-filter').value;

    if (search) filteredPets = filteredPets.filter(pet => pet.name.toLowerCase().includes(search));
    if (species) filteredPets = filteredPets.filter(pet => pet.species === species);
    if (porte) filteredPets = filteredPets.filter(pet => pet.porte === porte);
    if (color) filteredPets = filteredPets.filter(pet => pet.color === color);

    filteredPets.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'birthYear') return b.birthYear - a.birthYear;
        if (sortBy === 'species') return a.species.localeCompare(b.species);
        return 0;
    });

    displayPets(filteredPets);
}

// Exibe os detalhes de um pet
function viewPet(index) {
    const pet = state.pets[index];
    const modal = document.getElementById('pet-modal');
    document.getElementById('modal-title').textContent = pet.name;
    document.getElementById('modal-image').src = pet.image;
    document.getElementById('modal-details').innerHTML = `
        <p><strong>Espécie:</strong> ${pet.species}</p>
        <p><strong>Gênero:</strong> ${pet.gender}</p>
        <p><strong>Raça:</strong> ${pet.breed}</p>
        <p><strong>Porte:</strong> ${pet.porte}</p>
        <p><strong>Castrado:</strong> ${pet.castrado}</p>
        <p><strong>Ano de Nascimento/Adoção:</strong> ${pet.birthYear}</p>
        <p><strong>Cor:</strong> ${pet.color}</p>
        ${pet.description ? `<p><strong>Descrição:</strong> ${pet.description}</p>` : ''}
        <p><strong>Bairro:</strong> ${pet.location}</p>
        <p><strong>Contato:</strong> ${pet.contact}</p>
    `;
    modal.style.display = 'flex';
    updateChallenge('viewDetails');
}

// Edita um pet
function editPet(index) {
    state.form = { ...state.pets[index] };
    state.editingIndex = index;
    document.getElementById('pet-panel').classList.add('hidden');
    document.getElementById('registration-form').classList.remove('hidden');
    document.getElementById('pet-species').value = state.form.species;
    updateSpeciesIcon();
    document.getElementById('pet-name').value = state.form.name;
    document.getElementById('pet-description').value = state.form.description || '';
    document.getElementById('pet-gender').value = state.form.gender;
    document.querySelector(`input[name="porte"][value="${state.form.porte}"]`).checked = true;
    document.querySelector(`input[name="castrado"][value="${state.form.castrado}"]`).checked = true;
    document.getElementById('pet-birth-year').value = state.form.birthYear;
    document.getElementById('pet-color').value = state.form.color || '';
    if (state.form.color && !document.getElementById('pet-color').value) {
        document.getElementById('pet-color').value = 'Outra';
        document.getElementById('other-color-input').value = state.form.color;
        document.getElementById('other-color-input').style.display = 'block';
    }
    document.getElementById('pet-location').value = state.form.location;
    document.getElementById('pet-contact').value = state.form.contact;
    state.currentStep = 1;
    document.querySelectorAll('.step').forEach(step => step.classList.add('hidden'));
    document.getElementById('step-1').classList.remove('hidden');
    updateProgress();
    validateStep(1);
}

// Exclui um pet
function deletePet(index) {
    if (confirm('Tem certeza que deseja excluir este pet?')) {
        state.pets.splice(index, 1);
        localStorage.setItem('pets', JSON.stringify(state.pets));
        updatePoints(-5);
        displayPets();
        if (state.pets.length === 0) {
            document.getElementById('pet-panel').classList.add('hidden');
            document.getElementById('no-pet-message').classList.remove('hidden');
        }
    }
}

// Fecha o modal
function closeModal() {
    document.getElementById('pet-modal').style.display = 'none';
}

// Exporta para PDF
function exportPetsToPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Meus Pets', 10, 10);
    let y = 20;
    state.pets.forEach((pet, index) => {
        doc.setFontSize(12);
        doc.text(`${index + 1}. ${pet.name} (${pet.species})`, 10, y);
        doc.setFontSize(10);
        doc.text(`Raça: ${pet.breed}, Porte: ${pet.porte}, Cor: ${pet.color}`, 10, y + 5);
        doc.text(`Contato: ${pet.contact}`, 10, y + 10);
        y += 20;
        if (y > 280) {
            doc.addPage();
            y = 10;
        }
    });
    doc.save('meus_pets.pdf');
    updateChallenge('exportPets');
}

// Alterna o tema
function toggleTheme() {
    const isDarkMode = document.getElementById('theme-toggle').checked;
    localStorage.setItem('darkMode', isDarkMode);
    applyTheme();
}

// Exibe a seção do menu
function showSection(section) {
    console.log(`Exibindo seção: ${section}`);
    if (section === 'my-pets') {
        showPetPanel();
    }
}

// Inicializa os eventos dos botões usando delegação de eventos
function initializeButtons() {
    document.addEventListener('click', function(event) {
        if (event.target.id === 'my-pets-btn' || event.target.closest('#my-pets-btn')) {
            showPetPanel();
        } else if (event.target.id === 'toggle-challenges' || event.target.closest('#toggle-challenges')) {
            toggleChallenges();
        }
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    document.getElementById('theme-toggle').checked = localStorage.getItem('darkMode') === 'true';
    if (state.pets.length > 0) {
        showPetPanel();
    } else {
        document.getElementById('no-pet-message').classList.remove('hidden');
    }
    document.getElementById('pet-search').addEventListener('input', debounce(filterPets, 300));

    // Inicializa os eventos dos botões uma única vez
    initializeButtons();

    // Toggle do sidebar em mobile
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
        document.body.classList.toggle('sidebar-open');
        window.dispatchEvent(new Event('resize'));
    });

    // Listener para os links do menu lateral
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });
});