/**
 * Helpers pour la gestion des créneaux horaires
 */

// Jours de la semaine en français
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

// Mois en français
export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
] as const

// Couleurs par serveur
export const SERVER_COLORS = {
  1: { bg: 'bg-blue-500/80', border: 'border-blue-400', text: 'text-blue-300', dot: 'bg-blue-500', label: 'Serveur 1' },
  2: { bg: 'bg-green-500/80', border: 'border-green-400', text: 'text-green-300', dot: 'bg-green-500', label: 'Serveur 2' },
  3: { bg: 'bg-orange-500/80', border: 'border-orange-400', text: 'text-orange-300', dot: 'bg-orange-500', label: 'Serveur 3' },
} as const

/**
 * Retourne true si le jour est un jour de weekend (ven, sam, dim)
 * dayOfWeek: 0 = dimanche, 1 = lundi, ... 6 = samedi (JS Date standard)
 */
export function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
}

/**
 * Retourne l'heure de fin max selon le jour
 */
export function getMaxEndHour(date: Date): number {
  return isWeekend(date.getDay()) ? 4 : 3
}

/**
 * Génère les heures pour le calendrier pour un jour donné
 * De 18h00 à 03h00 (lun-jeu) ou 04h00 (ven-dim)
 */
export function getHoursForDay(dayOfWeek: number): string[] {
  const maxHour = isWeekend(dayOfWeek) ? 4 : 3
  const hours: string[] = []
  
  // 18h à 23h
  for (let h = 18; h <= 23; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`)
  }
  // 00h à maxHour
  for (let h = 0; h <= maxHour; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`)
  }
  
  return hours
}

/**
 * Génère toutes les heures du calendrier (union max = 18h-04h)
 */
export function getAllCalendarHours(): string[] {
  const hours: string[] = []
  for (let h = 18; h <= 23; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`)
  }
  for (let h = 0; h <= 4; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`)
  }
  return hours
}

/**
 * Convertit une heure "HH:MM" en minutes depuis 18h00
 * pour le positionnement dans le calendrier
 */
export function timeToMinutesSince18(time: string): number {
  const [h, m] = time.split(':').map(Number)
  // Si l'heure est < 18, c'est le lendemain (après minuit)
  if (h < 18) {
    return (24 - 18 + h) * 60 + m
  }
  return (h - 18) * 60 + m
}

/**
 * Calcule la durée en minutes entre deux heures
 */
export function durationInMinutes(start: string, end: string): number {
  const startMin = timeToMinutesSince18(start)
  const endMin = timeToMinutesSince18(end)
  return endMin - startMin
}

/**
 * Obtient le lundi de la semaine d'une date donnée
 */
export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Obtient les 7 jours de la semaine à partir du lundi
 */
export function getWeekDays(monday: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    days.push(day)
  }
  return days
}

/**
 * Formatte la plage de dates de la semaine
 */
export function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  const startDay = monday.getDate()
  const endDay = sunday.getDate()
  
  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay} – ${endDay} ${MOIS[monday.getMonth()]} ${monday.getFullYear()}`
  }
  
  return `${startDay} ${MOIS[monday.getMonth()]} – ${endDay} ${MOIS[sunday.getMonth()]} ${sunday.getFullYear()}`
}

/**
 * Formatte une date en YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Génère les options d'heure de début (18:00 à 02:00 ou 03:00)
 */
export function getStartTimeOptions(): string[] {
  const options: string[] = []
  for (let h = 18; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  for (let h = 0; h <= 2; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  return options
}

/**
 * Génère les options d'heure de fin en fonction de l'heure de début et du jour
 */
export function getEndTimeOptions(startTime: string, dayOfWeek: number): string[] {
  const maxHour = isWeekend(dayOfWeek) ? 4 : 3

  const options: string[] = []
  const startMinutes = timeToMinutesSince18(startTime)

  // Générer les heures de fin possibles (chaque 15min, max 2h après le début)
  for (let offset = 1; offset <= 8; offset++) {
    const totalMinutes = startMinutes + offset * 15
    // Convertir en heure réelle
    let hour = 18 + Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hour >= 24) hour -= 24

    // Vérifier que ça ne dépasse pas maxHour
    if (hour > maxHour && hour < 18) continue
    // Si on est à l'heure max, seule :00 est permise
    if (hour === maxHour && minutes > 0) continue

    options.push(`${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`)
  }

  return options
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() 
    && date.getMonth() === today.getMonth() 
    && date.getDate() === today.getDate()
}
