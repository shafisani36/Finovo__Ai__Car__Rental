/**
 * Text of the SMS / WhatsApp booking alerts in the six site languages.
 * Placeholders: {name} {number} {vehicle} {date} {branch} {amount}
 */
export type MessageTemplate =
  | 'BOOKING_AWAITING_APPROVAL'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'PICKUP_REMINDER'
  | 'RETURN_REMINDER'
  | 'RENTAL_STARTED'
  | 'RENTAL_RETURNED'
  | 'BOOKING_CANCELLED';

export const MESSAGE_LANGUAGES = ['en', 'ur', 'ar', 'fr', 'es', 'de'] as const;
export type MessageLanguage = (typeof MESSAGE_LANGUAGES)[number];

export const MESSAGE_TEMPLATES: Record<MessageTemplate, Record<MessageLanguage, string>> = {
  BOOKING_AWAITING_APPROVAL: {
    en: 'Finovo: Hi {name}, we received your booking #{number} for the {vehicle} and your payment. Our team is checking your documents; you will get a confirmation soon.',
    ur: 'Finovo: {name}، آپ کی بکنگ #{number} ({vehicle}) اور ادائیگی موصول ہو گئی۔ ہماری ٹیم آپ کے کاغذات دیکھ رہی ہے، جلد تصدیق ملے گی۔',
    ar: 'Finovo: مرحباً {name}، استلمنا حجزك #{number} للسيارة {vehicle} ودفعتك. يراجع فريقنا مستنداتك وسيصلك التأكيد قريباً.',
    fr: 'Finovo : Bonjour {name}, nous avons reçu votre réservation n°{number} ({vehicle}) et votre paiement. Nous vérifions vos documents ; la confirmation suit bientôt.',
    es: 'Finovo: Hola {name}, recibimos tu reserva n.º {number} ({vehicle}) y tu pago. Estamos revisando tus documentos; pronto recibirás la confirmación.',
    de: 'Finovo: Hallo {name}, wir haben Ihre Buchung Nr. {number} ({vehicle}) und Ihre Zahlung erhalten. Wir prüfen Ihre Dokumente; die Bestätigung folgt bald.',
  },
  BOOKING_REJECTED: {
    en: 'Finovo: Hi {name}, sorry, we could not approve booking #{number} for the {vehicle}. Refund: {amount}. The reason is in your email and your account.',
    ur: 'Finovo: {name}، معذرت، ہم بکنگ #{number} ({vehicle}) منظور نہیں کر سکے۔ واپسی: {amount}۔ وجہ آپ کی ای میل اور اکاؤنٹ میں ہے۔',
    ar: 'Finovo: مرحباً {name}، نعتذر، لم نتمكن من الموافقة على الحجز #{number} للسيارة {vehicle}. المبلغ المسترد: {amount}. السبب في بريدك وحسابك.',
    fr: 'Finovo : Bonjour {name}, désolé, la réservation n°{number} ({vehicle}) n\'a pas pu être acceptée. Remboursement : {amount}. Le motif est dans votre e-mail et votre compte.',
    es: 'Finovo: Hola {name}, lo sentimos, no pudimos aprobar la reserva n.º {number} ({vehicle}). Reembolso: {amount}. El motivo está en tu correo y tu cuenta.',
    de: 'Finovo: Hallo {name}, leider konnten wir die Buchung Nr. {number} ({vehicle}) nicht annehmen. Erstattung: {amount}. Den Grund finden Sie in Ihrer E-Mail und Ihrem Konto.',
  },
  BOOKING_CONFIRMED: {
    en: 'Finovo: Hi {name}, booking #{number} for the {vehicle} is confirmed. Pickup: {date} at {branch}.',
    ur: 'Finovo: {name}، بکنگ #{number} ({vehicle}) کنفرم ہو گئی۔ گاڑی لینا: {date}، {branch}۔',
    ar: 'Finovo: مرحباً {name}، تم تأكيد الحجز #{number} للسيارة {vehicle}. الاستلام: {date} في {branch}.',
    fr: 'Finovo : Bonjour {name}, la réservation n°{number} ({vehicle}) est confirmée. Départ : {date} à {branch}.',
    es: 'Finovo: Hola {name}, la reserva n.º {number} ({vehicle}) está confirmada. Recogida: {date} en {branch}.',
    de: 'Finovo: Hallo {name}, Buchung Nr. {number} ({vehicle}) ist bestätigt. Abholung: {date} in {branch}.',
  },
  PICKUP_REMINDER: {
    en: 'Finovo: Reminder: your {vehicle} (booking #{number}) is ready for pickup on {date} at {branch}. Please bring your driving licence and ID.',
    ur: 'Finovo: یاد دہانی: آپ کی {vehicle} (بکنگ #{number}) {date} کو {branch} پر تیار ہے۔ ڈرائیونگ لائسنس اور شناختی کارڈ ساتھ لائیں۔',
    ar: 'Finovo: تذكير: سيارتك {vehicle} (الحجز #{number}) جاهزة للاستلام في {date} في {branch}. يرجى إحضار رخصة القيادة والهوية.',
    fr: 'Finovo : Rappel : votre {vehicle} (réservation n°{number}) vous attend le {date} à {branch}. Apportez votre permis et une pièce d’identité.',
    es: 'Finovo: Recordatorio: tu {vehicle} (reserva n.º {number}) estará lista el {date} en {branch}. Trae tu carné y tu documento de identidad.',
    de: 'Finovo: Erinnerung: Ihr {vehicle} (Buchung Nr. {number}) steht am {date} in {branch} bereit. Bitte Führerschein und Ausweis mitbringen.',
  },
  RETURN_REMINDER: {
    en: 'Finovo: Reminder: please return the {vehicle} (booking #{number}) by {date} at {branch}, with the same fuel level as at pickup.',
    ur: 'Finovo: یاد دہانی: براہ کرم {vehicle} (بکنگ #{number}) {date} تک {branch} پر اسی فیول لیول کے ساتھ واپس کریں۔',
    ar: 'Finovo: تذكير: يرجى إعادة {vehicle} (الحجز #{number}) بحلول {date} إلى {branch} بمستوى الوقود نفسه.',
    fr: 'Finovo : Rappel : merci de rendre la {vehicle} (réservation n°{number}) avant le {date} à {branch}, avec le même niveau de carburant.',
    es: 'Finovo: Recordatorio: devuelve el {vehicle} (reserva n.º {number}) antes del {date} en {branch}, con el mismo nivel de combustible.',
    de: 'Finovo: Erinnerung: Bitte geben Sie den {vehicle} (Buchung Nr. {number}) bis {date} in {branch} mit gleichem Tankstand zurück.',
  },
  RENTAL_STARTED: {
    en: 'Finovo: Your trip with the {vehicle} has started. Return by {date} at {branch}. Your signed rental agreement is in your account. Drive safe!',
    ur: 'Finovo: {vehicle} کے ساتھ آپ کا سفر شروع ہو گیا۔ واپسی {date} تک {branch} پر۔ دستخط شدہ معاہدہ آپ کے اکاؤنٹ میں ہے۔ محفوظ سفر!',
    ar: 'Finovo: بدأت رحلتك مع {vehicle}. الإرجاع بحلول {date} إلى {branch}. عقد الإيجار الموقّع في حسابك. قيادة آمنة!',
    fr: 'Finovo : Votre trajet avec la {vehicle} a commencé. Retour avant le {date} à {branch}. Votre contrat signé est dans votre compte. Bonne route !',
    es: 'Finovo: Tu viaje con el {vehicle} ha empezado. Devolución antes del {date} en {branch}. Tu contrato firmado está en tu cuenta. ¡Buen viaje!',
    de: 'Finovo: Ihre Fahrt mit dem {vehicle} hat begonnen. Rückgabe bis {date} in {branch}. Ihr unterschriebener Mietvertrag ist in Ihrem Konto. Gute Fahrt!',
  },
  RENTAL_RETURNED: {
    en: 'Finovo: Thank you, {name}. The {vehicle} (booking #{number}) has been returned. Your return report is in your account.',
    ur: 'Finovo: شکریہ {name}۔ {vehicle} (بکنگ #{number}) واپس ہو گئی۔ واپسی کی رپورٹ آپ کے اکاؤنٹ میں ہے۔',
    ar: 'Finovo: شكراً {name}. تمت إعادة {vehicle} (الحجز #{number}). تقرير الإرجاع في حسابك.',
    fr: 'Finovo : Merci {name}. La {vehicle} (réservation n°{number}) a été rendue. Le rapport de retour est dans votre compte.',
    es: 'Finovo: Gracias, {name}. El {vehicle} (reserva n.º {number}) ha sido devuelto. El informe está en tu cuenta.',
    de: 'Finovo: Danke, {name}. Der {vehicle} (Buchung Nr. {number}) wurde zurückgegeben. Der Rückgabebericht ist in Ihrem Konto.',
  },
  BOOKING_CANCELLED: {
    en: 'Finovo: Booking #{number} ({vehicle}) has been cancelled. Refund: {amount}.',
    ur: 'Finovo: بکنگ #{number} ({vehicle}) منسوخ ہو گئی۔ واپسی کی رقم: {amount}۔',
    ar: 'Finovo: تم إلغاء الحجز #{number} ({vehicle}). المبلغ المسترد: {amount}.',
    fr: 'Finovo : La réservation n°{number} ({vehicle}) a été annulée. Remboursement : {amount}.',
    es: 'Finovo: La reserva n.º {number} ({vehicle}) ha sido cancelada. Reembolso: {amount}.',
    de: 'Finovo: Buchung Nr. {number} ({vehicle}) wurde storniert. Erstattung: {amount}.',
  },
};

export function renderMessage(template: MessageTemplate, language: string | null | undefined, values: Record<string, string>): string {
  const lang = (MESSAGE_LANGUAGES as readonly string[]).includes(String(language)) ? (language as MessageLanguage) : 'en';
  return MESSAGE_TEMPLATES[template][lang].replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}
