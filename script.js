/**
 * Calculateur de Vacations GTB
 * Gère le calcul des heures et montants pour différents types de vacations
 */

// Liste des vacations stockées
let vacations = [];

// Heures par défaut selon le type de vacation
const DEFAULT_START_TIMES = {
    simple: "18:45",
    billetterie: "18:45",
    ssiap: "18:45",
    cds: "18:15"
};

// Labels pour l'affichage
const TYPE_LABELS = {
    simple: "Simple",
    billetterie: "Billetterie",
    ssiap: "SSIAP",
    cds: "CDS"
};

// === FONCTIONS UTILITAIRES ===

/**
 * Récupère les taux horaires depuis les inputs
 */
function getRates() {
    return {
        simple: {
            jour: parseFloat(document.getElementById("rate-simple-jour").value),
            nuit: parseFloat(document.getElementById("rate-simple-nuit").value)
        },
        billetterie: {
            jour: parseFloat(document.getElementById("rate-billetterie-jour").value),
            nuit: parseFloat(document.getElementById("rate-billetterie-nuit").value)
        },
        ssiap: {
            jour: parseFloat(document.getElementById("rate-ssiap-jour").value),
            nuit: parseFloat(document.getElementById("rate-ssiap-nuit").value)
        },
        cds: {
            jour: parseFloat(document.getElementById("rate-cds-jour").value),
            nuit: parseFloat(document.getElementById("rate-cds-nuit").value)
        }
    };
}

/**
 * Convertit une heure "HH:MM" en minutes depuis minuit
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Vérifie si une heure donnée est en période de nuit (21h-6h)
 * @param {number} hour - L'heure (0-23)
 */
function isNightHour(hour) {
    return hour >= 21 || hour < 6;
}

/**
 * Calcule les heures pour une vacation
 * Chaque heure entamée est comptée, et classée jour/nuit selon son heure de début
 */
/**
 * Calcule les heures pour une vacation
 * Chaque heure entamée est comptée, et classée jour/nuit selon son heure de début
 * Minimum 3h payées, bonus +1h à partir de 6h
 */
function calculateHours(startTime, endTime) {
    let startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);
    
    // Si fin avant début, on passe minuit
    if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
    }
    
    // Calcul heure par heure
    let dayHours = 0;
    let nightHours = 0;
    let currentMinute = startMinutes;
    
    while (currentMinute < endMinutes) {
        const currentHour = Math.floor(currentMinute / 60) % 24;
        
        if (isNightHour(currentHour)) {
            nightHours++;
        } else {
            dayHours++;
        }
        
        currentMinute += 60;
    }
    
    const rawHours = dayHours + nightHours;
    
    // Minimum 3h payées (heures supplémentaires à partir de l'heure de fin)
    let bonusDayHours = dayHours;
    let bonusNightHours = nightHours;
    
    if (rawHours < 3) {
        let hoursToAdd = 3 - rawHours;
        let extraMinute = endMinutes;
        
        while (hoursToAdd > 0) {
            const extraHour = Math.floor(extraMinute / 60) % 24;
            if (isNightHour(extraHour)) {
                bonusNightHours++;
            } else {
                bonusDayHours++;
            }
            extraMinute += 60;
            hoursToAdd--;
        }
    }
    
    let totalPaidHours = Math.max(rawHours, 3);
    
    // Bonus d'1h à partir de la 6ème heure
    if (totalPaidHours >= 6) {
        totalPaidHours += 1;
        // Le bonus est classé selon l'heure courante (après les heures travaillées/minimum)
        const bonusHour = Math.floor((startMinutes + totalPaidHours * 60 - 60) / 60) % 24;
        if (isNightHour(bonusHour)) {
            bonusNightHours++;
        } else {
            bonusDayHours++;
        }
    }
    
    return {
        dayHours: bonusDayHours,
        nightHours: bonusNightHours,
        totalPaidHours: totalPaidHours,
        rawHours: rawHours
    };
}

/**
 * Calcule le montant pour une vacation
 */
function calculateVacation(type, startTime, endTime) {
    const rates = getRates();
    const hours = calculateHours(startTime, endTime);
    
    const dayAmount = hours.dayHours * rates[type].jour;
    const nightAmount = hours.nightHours * rates[type].nuit;
    const totalAmount = dayAmount + nightAmount;
    
    return {
        dayHours: hours.dayHours,
        nightHours: hours.nightHours,
        totalHours: hours.totalPaidHours,
        rawHours: hours.rawHours,
        amount: totalAmount
    };
}

// === FONCTIONS D'AFFICHAGE ===

/**
 * Affiche la liste des vacations
 */
function renderVacations() {
    const container = document.getElementById("vacations-list");
    
    if (vacations.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucune vacation ajoutée</p>';
        updateTotals();
        return;
    }
    
    container.innerHTML = vacations.map((v, index) => {
        const calc = calculateVacation(v.type, v.startTime, v.endTime);
        const noteHtml = v.note ? `<div class="vacation-note">${v.note}</div>` : '';
        return `
            <div class="vacation-card type-${v.type}">
                <div class="vacation-info">
                    <div class="vacation-type">${TYPE_LABELS[v.type]}</div>
                    ${noteHtml}
                    <div class="vacation-time">${v.startTime} → ${v.endTime}</div>
                </div>
                <div class="vacation-result">
                    <div class="vacation-hours-detail">${calc.rawHours}h brut → ${calc.totalHours}h eff. (${calc.dayHours}h jour / ${calc.nightHours}h nuit)</div>
                    <div class="vacation-amount">${calc.amount.toFixed(2)} €</div>
                </div>
                <button class="btn-delete" onclick="deleteVacation(${index})">×</button>
            </div>
        `;
    }).join("");
    
    updateTotals();
}

/**
 * Met à jour les totaux affichés
 */
function updateTotals() {
    let totalHours = 0;
    let totalAmount = 0;
    
    vacations.forEach(v => {
        const calc = calculateVacation(v.type, v.startTime, v.endTime);
        totalHours += calc.totalHours;
        totalAmount += calc.amount;
    });
    
    document.getElementById("total-count").textContent = vacations.length;
    document.getElementById("total-hours").textContent = `${totalHours} h`;
    document.getElementById("total-amount").textContent = `${totalAmount.toFixed(2)} €`;
}

// === FONCTIONS D'ACTION ===

/**
 * Ajoute une vacation à la liste
 */
function addVacation() {
    const type = document.getElementById("type-select").value;
    const startTime = document.getElementById("start-time").value;
    const endTime = document.getElementById("end-time").value;
    const note = document.getElementById("note-input").value.trim();
    
    if (!startTime || !endTime) {
        alert("Veuillez renseigner les heures de début et de fin.");
        return;
    }
    
    vacations.push({ type, startTime, endTime, note });
    renderVacations();
    saveToLocalStorage();
    
    // Vide le champ note après ajout
    document.getElementById("note-input").value = "";
}

/**
 * Ajoute une vacation "Accueil Location"
 */
function addAccueilLocation() {
    vacations.push({
        type: "simple",
        startTime: "12:30",
        endTime: "18:45",
        note: "Accueil Location"
    });
    renderVacations();
    saveToLocalStorage();
}

/**
 * Supprime une vacation par son index
 */
function deleteVacation(index) {
    vacations.splice(index, 1);
    renderVacations();
    saveToLocalStorage();
}

/**
 * Efface toutes les vacations
 */
function clearAll() {
    if (confirm("Effacer toutes les vacations ?")) {
        vacations = [];
        renderVacations();
        saveToLocalStorage();
    }
}

// === FONCTIONS IMPORT/EXPORT ===

/**
 * Exporte les données en JSON
 */
function exportJSON() {
    const data = {
        rates: getRates(),
        vacations: vacations
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `vacations_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

/**
 * Exporte un récapitulatif PDF minimaliste
 */
function exportPDF() {
    if (vacations.length === 0) {
        alert("Aucune vacation à exporter.");
        return;
    }
    
    // Calcul des totaux
    let totalHours = 0;
    let totalAmount = 0;
    
    // Génère le contenu HTML pour le PDF
    let rows = vacations.map(v => {
        const calc = calculateVacation(v.type, v.startTime, v.endTime);
        totalHours += calc.totalHours;
        totalAmount += calc.amount;
        const noteStr = v.note ? ` (${v.note})` : '';
        return `
            <tr>
                <td>${TYPE_LABELS[v.type]}${noteStr}</td>
                <td>${v.startTime} → ${v.endTime}</td>
                <td>${calc.totalHours}h</td>
                <td>${calc.amount.toFixed(2)} €</td>
            </tr>
        `;
    }).join("");
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Récapitulatif Vacations</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
                h1 { font-size: 18px; margin-bottom: 5px; }
                .date { font-size: 12px; color: #666; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background: #f5f5f5; font-weight: 600; }
                .totals { margin-top: 20px; font-size: 14px; }
                .totals strong { font-size: 16px; }
            </style>
        </head>
        <body>
            <h1>Récapitulatif des Vacations</h1>
            <p class="date">Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Horaires</th>
                        <th>Heures</th>
                        <th>Montant</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <div class="totals">
                <p><strong>Total : ${totalHours}h — ${totalAmount.toFixed(2)} €</strong></p>
            </div>
        </body>
        </html>
    `;
    
    // Ouvre dans une nouvelle fenêtre et déclenche l'impression
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
    };
}

/**
 * Importe les données depuis un fichier JSON
 */
function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.rates) {
                Object.keys(data.rates).forEach(type => {
                    const jourInput = document.getElementById(`rate-${type}-jour`);
                    const nuitInput = document.getElementById(`rate-${type}-nuit`);
                    if (jourInput) jourInput.value = data.rates[type].jour;
                    if (nuitInput) nuitInput.value = data.rates[type].nuit;
                });
            }
            
            if (data.vacations) {
                vacations = data.vacations;
                renderVacations();
            }
            
            saveToLocalStorage();
            alert("Import réussi !");
        } catch (err) {
            alert("Erreur lors de l'import : fichier invalide.");
        }
    };
    reader.readAsText(file);
    event.target.value = "";
}

/**
 * Sauvegarde en localStorage
 */
function saveToLocalStorage() {
    const data = {
        rates: getRates(),
        vacations: vacations
    };
    localStorage.setItem("gtb_calculator_data", JSON.stringify(data));
}

/**
 * Charge depuis localStorage
 */
function loadFromLocalStorage() {
    const saved = localStorage.getItem("gtb_calculator_data");
    if (!saved) return;
    
    try {
        const data = JSON.parse(saved);
        
        if (data.rates) {
            Object.keys(data.rates).forEach(type => {
                const jourInput = document.getElementById(`rate-${type}-jour`);
                const nuitInput = document.getElementById(`rate-${type}-nuit`);
                if (jourInput) jourInput.value = data.rates[type].jour;
                if (nuitInput) nuitInput.value = data.rates[type].nuit;
            });
        }
        
        if (data.vacations) {
            vacations = data.vacations;
        }
    } catch (err) {
        console.error("Erreur chargement localStorage:", err);
    }
}

// === ÉVÉNEMENTS ===

function onTypeChange() {
    const type = document.getElementById("type-select").value;
    if (vacations.length === 0) {
        document.getElementById("start-time").value = DEFAULT_START_TIMES[type];
    }
}

// Initialisation
document.addEventListener("DOMContentLoaded", function() {
    loadFromLocalStorage();
    renderVacations();
    
    document.getElementById("btn-add").addEventListener("click", addVacation);
    document.getElementById("btn-location").addEventListener("click", addAccueilLocation);
    document.getElementById("btn-export").addEventListener("click", exportJSON);
    document.getElementById("btn-pdf").addEventListener("click", exportPDF);
    document.getElementById("btn-clear").addEventListener("click", clearAll);
    
    document.getElementById("btn-import").addEventListener("click", function() {
        document.getElementById("file-import").click();
    });
    document.getElementById("file-import").addEventListener("change", importJSON);
    
    document.getElementById("type-select").addEventListener("change", onTypeChange);
    
    document.querySelectorAll(".rates-table input").forEach(input => {
        input.addEventListener("change", function() {
            renderVacations();
            saveToLocalStorage();
        });
    });
});