// API endpoint
const API_URL = 'https://https://1nkognit0-diploma.hf.space/api/submit';

let contactCounter = 0;

// Добавление нового контакта
function addContact() {
    contactCounter++;
    const container = document.getElementById('contactsContainer');
    
    const contactDiv = document.createElement('div');
    contactDiv.className = 'contact-item';
    contactDiv.id = `contact-${contactCounter}`;
    
    contactDiv.innerHTML = `
        <div class="contact-row">
            <div class="contact-type">
                <label>Тип контакта</label>
                <select name="contactType" required>
                    <option value="">Выберите тип</option>
                    <option value="phone">Телефон</option>
                    <option value="email">Email</option>
                </select>
            </div>
            <div class="contact-value">
                <label>Значение</label>
                <input type="text" name="contactValue" required 
                       placeholder="Введите контакт">
            </div>
            <button type="button" class="btn-remove" onclick="removeContact(${contactCounter})">
                Удалить
            </button>
        </div>
    `;
    
    container.appendChild(contactDiv);
}

// Удаление контакта
function removeContact(id) {
    const contactDiv = document.getElementById(`contact-${id}`);
    if (contactDiv) {
        contactDiv.remove();
    }
}

// Показ сообщения
function showMessage(text, isError = false) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.classList.remove('hidden');
    
    // Скрыть сообщение через 5 секунд
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

function formatValidationError(detail) {
    if (Array.isArray(detail)) {
        // Берем первую ошибку и делаем ее читаемой
        const error = detail[0];
        const field = error.loc.slice(1).join('.'); // убираем 'body'
        
        // Преобразуем технические сообщения в понятные
        if (error.msg.includes('phone')) {
            return 'Некорректный формат номера телефона';
        } else if (error.msg.includes('email')) {
            return 'Некорректный формат email';
        } else if (error.msg.includes('at least one contact')) {
            return 'Необходимо указать хотя бы один контакт';
        } else if (error.msg.includes('String should have at most')) {
            return 'Слишком длинное значение';
        }
        
        // Возвращаем упрощенную версию
        return `Ошибка в поле ${field}: ${error.msg.replace('Value error, ', '')}`;
    }
    return 'Неизвестная ошибка';
}

// Обработка отправки формы
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Сбор данных формы
    const formData = {
        name: document.getElementById('name').value.trim() || null,
        work_type: document.getElementById('workType').value,
        description: document.getElementById('description').value.trim(),
        contacts: []
    };

    // Валидируем обязательные поля
    if (!formData.description) {
        showMessage('Пожалуйста, заполните описание заказа', true);
        document.getElementById('description').focus();
        return;
    }
    
    // Сбор контактных данных
    const contactItems = document.querySelectorAll('.contact-item');
    
    if (contactItems.length === 0) {
        showMessage('Пожалуйста, добавьте хотя бы один контакт', true);
        return;
    }
    
    contactItems.forEach(item => {
        const type = item.querySelector('select[name="contactType"]').value;
        const value = item.querySelector('input[name="contactValue"]').value.trim();
        
        if (type && value) {
            formData.contacts.push({
                type: type,
                value: value
            });
        }
    });
    
    // Проверка наличия хотя бы одного контакта
    if (formData.contacts.length === 0) {
        showMessage('Пожалуйста, заполните хотя бы один контакт', true);
        return;
    }
    
    // Отправка данных на сервер
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Заявка успешно отправлена!');
            // Очистка формы
            document.getElementById('orderForm').reset();
            document.getElementById('contactsContainer').innerHTML = '';
            contactCounter = 0;
        } else {
            const errorMessage = formatValidationError(result.detail);
            showMessage(errorMessage, true);
        }
    } catch (error) {
        console.error('Ошибка при отправке:', error);
        showMessage('Ошибка соединения с сервером. Убедитесь, что бэкенд запущен.', true);
    }
});

// Добавить первый контакт при загрузке страницы
window.addEventListener('DOMContentLoaded', function() {
    addContact();
});
