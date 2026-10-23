import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Язык интерфейса: русский (по умолчанию) или казахский.
 *
 * Словари — плоские ключ → текст. t(key, vars) подставляет {переменные}.
 * Если ключа нет в kazakh-словаре, берётся русский; если нет и его — сам ключ.
 * Выбор языка хранится в localStorage и применяется ко всему интерфейсу.
 */

const ru = {
  'nav.catalog': 'Каталог',
  'nav.compare': 'Сравнение',
  'nav.favorites': 'Избранное',
  'nav.assistant': 'AI-помощник',
  'nav.routes': 'Маршруты',
  'nav.business': 'Для бизнеса',
  'nav.myReservations': 'Мои брони',
  'nav.admin': 'Админ',
  'nav.myVehicles': 'Моя техника',
  'nav.vehiclesShort': 'Техника',
  'auth.login': 'Войти',
  'auth.register': 'Регистрация',
  'auth.logout': 'Выйти',

  'footer.project': 'учебный проект',
  'footer.apiDocs': 'API-документация',

  'notFound.title': 'Страница не найдена',
  'notFound.text': 'Проверьте адрес или вернитесь к каталогу автомобилей.',
  'notFound.back': 'К каталогу',

  'home.title': 'Аренда техники по Казахстану',
  'home.subtitle':
    'Легковые, грузовые и спецтехника. Выберите группу, затем класс — и забронируйте за минуту. Цена считается сразу: скидка 10% с 7 дней и 20% с 30 дней.',
  'home.collectionConstruction': 'Для стройки',
  'home.collectionWedding': 'Для свадьбы',
  'home.collectionMountains': 'Для поездки в горы',
  'home.group': 'Группа',
  'home.groupAll': 'Все группы',
  'home.category': 'Категория',
  'home.categoryAny': 'Любая',
  'home.city': 'Город',
  'home.cityAny': 'Любой город',
  'home.maxPrice': 'Цена до, ₸/сут',
  'home.brand': 'Марка',
  'home.brandAny': 'Любая',
  'home.license': 'Права',
  'home.licenseAny': 'Любые',
  'home.withOperator': 'С оператором',
  'home.dates': 'Даты аренды',
  'home.startDate': 'С',
  'home.endDate': 'По',
  'home.availableOnly': 'Только свободные на даты',
  'home.apply': 'Применить',
  'home.reset': 'Сбросить',
  'home.results': 'Найдено машин: {count}',
  'home.empty': 'Ничего не найдено',
  'home.emptyText': 'Попробуйте изменить фильтры или сбросить их.',

  'cars.perDay': 'в сутки',
  'cars.perHour': 'в час',
  'cars.book': 'Забронировать',
  'cars.details': 'Подробнее',
  'cars.compareAdd': 'К сравнению',
  'cars.compareRemove': 'Убрать из сравнения',
  'cars.favoriteAdd': 'В избранное',
  'cars.favoriteRemove': 'Убрать из избранного',
  'cars.operator': 'с оператором',
  'cars.seats': 'мест',
  'cars.reviews': 'отзывов',
  'cars.rating': 'Рейтинг',

  'compare.title': 'Сравнение',
  'compare.subtitle': 'До 3 машин рядом: цены, характеристики и рейтинг — как в автосалоне.',
  'compare.empty': 'Сравнивать пока нечего',
  'compare.emptyText': 'Нажмите ⇄ на карточках в каталоге — выберите до 3 машин.',
  'compare.pick': 'Выбрать машины',
  'compare.clear': 'Очистить',
  'compare.best': 'лучшее',

  'favorites.title': 'Избранное',
  'favorites.empty': 'В избранном пока пусто',
  'favorites.emptyText': 'Отмечайте машины сердечком в каталоге — они появятся здесь.',

  'login.title': 'Вход в аккаунт',
  'login.subtitle': 'Введите email и пароль, чтобы бронировать автомобили.',
  'login.email': 'Email',
  'login.password': 'Пароль',
  'login.submit': 'Войти',
  'login.noAccount': 'Нет аккаунта?',
  'login.registerLink': 'Зарегистрироваться',
  'login.demo': 'Демо-доступ:',

  'register.title': 'Регистрация',
  'register.subtitle': 'Создайте аккаунт, чтобы бронировать технику и управлять бронями.',
  'register.firstName': 'Имя',
  'register.lastName': 'Фамилия',
  'register.phone': 'Телефон',
  'register.role': 'Роль',
  'register.roleUser': 'Клиент — аренда для себя',
  'register.roleOwner': 'Владелец — сдаю свою технику',
  'register.license': 'Категория прав',
  'register.licenseNone': 'Не указывать',
  'register.haveAccount': 'Уже есть аккаунт?',
  'register.submit': 'Создать аккаунт',

  'profile.title': 'Профиль',
  'profile.save': 'Сохранить',
  'profile.saved': 'Сохранено',
  'profile.license': 'Категория водительского удостоверения',
  'profile.licenseHint': 'Нужна для бронирования техники, требующей категории C, E или спецудостоверение.',

  'myReservations.title': 'Мои брони',
  'myReservations.empty': 'Броней пока нет',
  'myReservations.emptyText': 'Выберите технику в каталоге и забронируйте — брони появятся здесь.',
  'myReservations.cancel': 'Отменить',
  'myReservations.pdf': 'Скачать PDF',
  'myReservations.status': 'Статус',
  'myReservations.period': 'Период',
  'myReservations.total': 'Итого',

  'business.title': 'Для бизнеса',
  'business.subtitle':
    'Оформите заявку на несколько единиц техники для юрлица: укажите название компании и БИН. После подтверждения скачайте счёт в PDF.',
  'business.newOrder': 'Новая заявка',
  'business.company': 'Название компании',
  'business.bin': 'БИН (12 цифр)',
  'business.items': 'Позиции заявки',
  'business.addItem': 'Добавить позицию',
  'business.removeItem': 'Убрать',
  'business.vehicle': 'Техника',
  'business.pickVehicle': '— выберите —',
  'business.submit': 'Отправить заявку',
  'business.myOrders': 'Мои заявки',
  'business.invoice': 'Счёт PDF',
  'business.total': 'Итого по счёту',
  'business.empty': 'Заявок пока нет',

  'assistant.title': 'AI-помощник',
  'assistant.placeholder': 'Спросите: «нужен кран в Алматы на 3 дня»…',
  'assistant.send': 'Отправить',
  'assistant.hint': 'Помощник подберёт технику по городу, датам и задаче.',

  'status.PENDING': 'Ожидает',
  'status.CONFIRMED': 'Подтверждена',
  'status.ACTIVE': 'Активна',
  'status.COMPLETED': 'Завершена',
  'status.CANCELLED': 'Отменена',

  'common.loading': 'Загружаем данные…',
  'common.error': 'Что-то пошло не так',
  'common.retry': 'Повторить',
  'common.close': 'Закрыть',
  'common.days': 'дн.',
  'common.hours': 'ч',
  'common.theme': 'Тема',
  'common.language': 'Язык'
}

const kz = {
  'nav.catalog': 'Каталог',
  'nav.compare': 'Салыстыру',
  'nav.favorites': 'Таңдаулылар',
  'nav.assistant': 'AI-көмекші',
  'nav.routes': 'Маршруттар',
  'nav.business': 'Бизнеске',
  'nav.myReservations': 'Менің броньдарым',
  'nav.admin': 'Әкімші',
  'nav.myVehicles': 'Менің техникаларым',
  'nav.vehiclesShort': 'Техника',
  'auth.login': 'Кіру',
  'auth.register': 'Тіркелу',
  'auth.logout': 'Шығу',

  'footer.project': 'оқу жобасы',
  'footer.apiDocs': 'API құжаттамасы',

  'notFound.title': 'Бет табылмады',
  'notFound.text': 'Мекенжайды тексеріңіз немесе көлік каталогына оралыңыз.',
  'notFound.back': 'Каталогқа',

  'home.title': 'Қазақстан бойынша техника жалдау',
  'home.subtitle':
    'Жүк көліктері, жеңіл көліктер және арнайы техника. Топты таңдап, сыныпты белгілеңіз — бір минутта бронь жасаңыз. Баға бірден есептеледі: 7 тәуліктен 10%, 30 тәуліктен 20% жеңілдік.',
  'home.collectionConstruction': 'Құрылысқа',
  'home.collectionWedding': 'Тойға',
  'home.collectionMountains': 'Тауға сапарға',
  'home.group': 'Топ',
  'home.groupAll': 'Барлық топтар',
  'home.category': 'Санат',
  'home.categoryAny': 'Кез келген',
  'home.city': 'Қала',
  'home.cityAny': 'Кез келген қала',
  'home.maxPrice': 'Бағасы, ₸/тәулік',
  'home.brand': 'Марка',
  'home.brandAny': 'Кез келген',
  'home.license': 'Куәлік',
  'home.licenseAny': 'Кез келген',
  'home.withOperator': 'Оператормен',
  'home.dates': 'Жалдау күндері',
  'home.startDate': 'Басталуы',
  'home.endDate': 'Аяқталуы',
  'home.availableOnly': 'Тек бос техника',
  'home.apply': 'Қолдану',
  'home.reset': 'Тазарту',
  'home.results': 'Табылған көліктер: {count}',
  'home.empty': 'Ештеңе табылмады',
  'home.emptyText': 'Сүзгілерді өзгертіңіз немесе тазалаңыз.',

  'cars.perDay': 'тәулігіне',
  'cars.perHour': 'сағатына',
  'cars.book': 'Бронь жасау',
  'cars.details': 'Толығырақ',
  'cars.compareAdd': 'Салыстыруға',
  'cars.compareRemove': 'Салысырудан алу',
  'cars.favoriteAdd': 'Таңдаулыға',
  'cars.favoriteRemove': 'Таңдаулыдан алу',
  'cars.operator': 'оператормен',
  'cars.seats': 'орын',
  'cars.reviews': 'пікір',
  'cars.rating': 'Рейтинг',

  'compare.title': 'Салыстыру',
  'compare.subtitle': '3 көлік бір жерде: баға, сипаттамалар және рейтинг — автосалондағыдай.',
  'compare.empty': 'Салыстыратын ештеңе жоқ',
  'compare.emptyText': 'Каталогтағы карточкалардағы ⇄ батырмасын басыңыз — 3 көлікке дейін таңдаңыз.',
  'compare.pick': 'Көліктерді таңдау',
  'compare.clear': 'Тазарту',
  'compare.best': 'ең жақсы',

  'favorites.title': 'Таңдаулылар',
  'favorites.empty': 'Таңдаулылар әлі бос',
  'favorites.emptyText': 'Каталогтағы көліктерді жүрекбелгімен белгілеңіз — олар осында пайда болады.',

  'login.title': 'Аккаунтқа кіру',
  'login.subtitle': 'Көліктерді броньдеу үшін email мен құпиясөзді енгізіңіз.',
  'login.email': 'Email',
  'login.password': 'Құпиясөз',
  'login.submit': 'Кіру',
  'login.noAccount': 'Аккаунтыңыз жоқ па?',
  'login.registerLink': 'Тіркелу',
  'login.demo': 'Демо-кіру:',

  'register.title': 'Тіркелу',
  'register.subtitle': 'Техниканы броньдеу және басқару үшін аккаунт жасаңыз.',
  'register.firstName': 'Аты',
  'register.lastName': 'Тегі',
  'register.phone': 'Телефон',
  'register.role': 'Рөл',
  'register.roleUser': 'Клиент — өзіме жалдау',
  'register.roleOwner': 'Иегер — техникалық жалдаймын',
  'register.license': 'Куәлік санаты',
  'register.licenseNone': 'Көрсетпеймін',
  'register.haveAccount': 'Аккаунтыңыз бар ма?',
  'register.submit': 'Аккаунт жасау',

  'profile.title': 'Профиль',
  'profile.save': 'Сақтау',
  'profile.saved': 'Сақталды',
  'profile.license': 'Жүргізуші куәлігінің санаты',
  'profile.licenseHint': 'C, E немесе арнайы санатты техниканы броньдеу қажет.',

  'myReservations.title': 'Менің броньдарым',
  'myReservations.empty': 'Броньдар әлі жоқ',
  'myReservations.emptyText': 'Каталогтан техника таңдап, бронь жасаңыз — броньдар осында көрінеді.',
  'myReservations.cancel': 'Болдырмау',
  'myReservations.pdf': 'PDF жүктеу',
  'myReservations.status': 'Күйі',
  'myReservations.period': 'Кезең',
  'myReservations.total': 'Барлығы',

  'business.title': 'Бизнеске',
  'business.subtitle':
    'Заңды тұлға үшін бірнеше техникаға өтінім рәсімдеңіз: компания атын және БИН-ді көрсетіңіз. Расталғаннан кейін PDF-төлем шотын жүктеңіз.',
  'business.newOrder': 'Жаңа өтінім',
  'business.company': 'Компания аты',
  'business.bin': 'БИН (12 сан)',
  'business.items': 'Өтінім тармақтары',
  'business.addItem': 'Тармақ қосу',
  'business.removeItem': 'Алу',
  'business.vehicle': 'Техника',
  'business.pickVehicle': '— таңдаңыз —',
  'business.submit': 'Өтінім жіберу',
  'business.myOrders': 'Менің өтінімдерім',
  'business.invoice': 'Шот PDF',
  'business.total': 'Шот барлығы',
  'business.empty': 'Өтінімдер әлі жоқ',

  'assistant.title': 'AI-көмекші',
  'assistant.placeholder': 'Сұраңыз: «Алматыда 3 күнге кран керек»…',
  'assistant.send': 'Жіберу',
  'assistant.hint': 'Көмекші қала, күндер және міндет бойынша техника таңдайды.',

  'status.PENDING': 'Күтуде',
  'status.CONFIRMED': 'Расталды',
  'status.ACTIVE': 'Белсенді',
  'status.COMPLETED': 'Аяқталды',
  'status.CANCELLED': 'Болдырылды',

  'common.loading': 'Деректер жүктелуде…',
  'common.error': 'Бірдеңе қате кетті',
  'common.retry': 'Қайталау',
  'common.close': 'Жабу',
  'common.days': 'тәулік',
  'common.hours': 'сағ',
  'common.theme': 'Тақырып',
  'common.language': 'Тіл'
}

const DICTS = { ru, kz }

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('autorent_lang') || 'ru')

  useEffect(() => {
    localStorage.setItem('autorent_lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    if (DICTS[next]) setLangState(next)
  }, [])

  const t = useCallback(
    (key, vars) => {
      const dict = DICTS[lang] || ru
      let text = dict[key] ?? ru[key] ?? key
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value))
        }
      }
      return text
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used inside LanguageProvider')
  return ctx
}
