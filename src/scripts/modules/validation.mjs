import { MINIMUM_FINAL_NOTU_FAKULTE, MINIMUM_FINAL_NOTU_VARSAYILAN } from './calculation-core.mjs';

function getMinimumFinalNotu(formTypeSuffix, formElement) {
    const secili = formElement ? formElement.querySelector(`input[name="fakulte${formTypeSuffix}"]:checked`) : null;
    const deger = secili ? secili.value : 'genel';
    return MINIMUM_FINAL_NOTU_FAKULTE[deger] !== undefined ? MINIMUM_FINAL_NOTU_FAKULTE[deger] : MINIMUM_FINAL_NOTU_VARSAYILAN;
}


// --- Form Doğrulama ve Yardımcı Fonksiyonlar ---
function showFieldError(inputElement, message) {
    const formGroup = inputElement.closest('.form-group');
    if (!formGroup) return;
    clearFieldError(inputElement);
    inputElement.classList.add('invalid-input');
    const errorSpan = document.createElement('span');
    errorSpan.className = 'error-feedback fade-in';
    errorSpan.textContent = message;
    const hintElement = formGroup.querySelector('small');
    if (hintElement && hintElement.parentElement === formGroup) {
        hintElement.insertAdjacentElement('afterend', errorSpan);
    } else {
        formGroup.appendChild(errorSpan);
    }
}


function clearFieldError(inputElement) {
    if (!inputElement) return;
    const formGroup = inputElement.closest('.form-group');
    if (!formGroup) return;
    inputElement.classList.remove('invalid-input');
    const errorSpan = formGroup.querySelector('span.error-feedback');
    if (errorSpan) {
        errorSpan.classList.remove('fade-in');
        errorSpan.classList.add('fade-out');
        setTimeout(() => {
            if (errorSpan.parentNode) {
                errorSpan.parentNode.removeChild(errorSpan);
            }
        }, 280);
    }
}


function validateRequiredField(inputElement, fieldName) {
    if (!inputElement) return true;
    const value = inputElement.value;
    if (!value) {
        showFieldError(inputElement, `${fieldName} alanı boş bırakılamaz.`);
        return false;
    }
    clearFieldError(inputElement);
    return true;
}


function validateNumberField(inputElement, fieldName, min, max) {
    if (!inputElement) return true;
    const value = inputElement.value.trim();
    if (!value) {
        if (inputElement.required) {
            showFieldError(inputElement, `${fieldName} alanı boş bırakılamaz.`);
            return false;
        }
        clearFieldError(inputElement);
        return true;
    }
    const numberValue = parseFloat(value);
    if (!Number.isFinite(numberValue)) {
        showFieldError(inputElement, `${fieldName} geçerli bir sayı olmalıdır.`);
        return false;
    }
    if (min !== null && numberValue < min) {
        showFieldError(inputElement, `${fieldName} en az ${min} olmalıdır.`);
        return false;
    }
    if (max !== null && numberValue > max) {
        showFieldError(inputElement, `${fieldName} en fazla ${max} olmalıdır.`);
        return false;
    }
    clearFieldError(inputElement);
    return true;
}


function validateDetailedWeights(vizeAgirlikInput, odevAgirlikInput, formTypeSuffix) {
    if (!vizeAgirlikInput || !odevAgirlikInput) return true;

    const vizeAgirlikVal = parseFloat(vizeAgirlikInput.value);
    const odevAgirlikVal = parseFloat(odevAgirlikInput.value);

    if (vizeAgirlikInput.value.trim() && odevAgirlikInput.value.trim() &&
        !isNaN(vizeAgirlikVal) && !isNaN(odevAgirlikVal) &&
        vizeAgirlikVal >= 0 && vizeAgirlikVal <= 50 &&
        odevAgirlikVal >= 0 && odevAgirlikVal <= 50) {  

        if (Math.abs(vizeAgirlikVal + odevAgirlikVal - 50) > 1e-9) {
            const message = "Vize ve Ödev ağırlıklarının toplamı 50 olmalıdır.";
            const vizeErrorSpanOld = vizeAgirlikInput.closest('.form-group').querySelector('span.error-feedback[data-type="weight-sum"]');
            if(vizeErrorSpanOld) clearFieldError(vizeAgirlikInput);
            const odevErrorSpanOld = odevAgirlikInput.closest('.form-group').querySelector('span.error-feedback[data-type="weight-sum"]');
            if(odevErrorSpanOld) clearFieldError(odevAgirlikInput);

            showFieldError(vizeAgirlikInput, message);
            let vizeErrorSpanNew = vizeAgirlikInput.closest('.form-group').querySelector('span.error-feedback');
            if(vizeErrorSpanNew) vizeErrorSpanNew.dataset.type = "weight-sum";

            showFieldError(odevAgirlikInput, message);
            let odevErrorSpanNew = odevAgirlikInput.closest('.form-group').querySelector('span.error-feedback');
            if(odevErrorSpanNew) odevErrorSpanNew.dataset.type = "weight-sum";
            return false;
        } else {
            const vizeErrorSpan = vizeAgirlikInput.closest('.form-group').querySelector('span.error-feedback[data-type="weight-sum"]');
            if (vizeErrorSpan) clearFieldError(vizeAgirlikInput);

            const odevErrorSpan = odevAgirlikInput.closest('.form-group').querySelector('span.error-feedback[data-type="weight-sum"]');
            if (odevErrorSpan) clearFieldError(odevAgirlikInput);
        }
    }
    return true;
}
export { getMinimumFinalNotu, showFieldError, clearFieldError, validateRequiredField, validateNumberField, validateDetailedWeights };
