import { Property, HadabaWostaNeighborhood, OwnerSubmission } from '../types';
import { USER_EXCEL_PROPERTIES } from './userProperties';
import { OFF_PLAN_PROPERTIES_DATA } from './offPlanProperties';

export const HADABA_WOSTA_NEIGHBORHOODS: HadabaWostaNeighborhood[] = [
  'الحي الأول',
  'الحي الثاني',
  'الحي الثالث',
  'الحي الرابع',
  'الحي الخامس',
  'الحي السادس',
  'الحي السابع',
  'الحي الثامن',
  'تقسيم المباحث'
];

// مبقاش ليها أي دور في الدخول: الدخول كله من Firebase Authentication
export const DEFAULT_ADMIN_CREDENTIALS = {
  email: 'admin@elsaba.com',
  password: ''
};

export interface DistrictInfo {
  name: HadabaWostaNeighborhood;
  tagline: string;
  desc: string;
  imageUrl?: string;
  locationDetails: string;
  avgMeterFinished: string;
  avgMeterSemi: string;
  keyLandmarks: string[];
  mainRoads: string[];
  advantages: string[];
  propertyTypesFocus: string;
  investmentRating: number; // 1-5
  residentialRating: number; // 1-5
}

export interface HighwayInfo {
  name: string;
  description: string;
  destinations: string;
  travelTime: string;
}

export interface LandmarkCategory {
  category: string;
  items: { name: string; district: string; desc: string }[];
}

export interface LegalTip {
  title: string;
  description: string;
  iconType: 'document' | 'shield' | 'alert' | 'check';
}

export const HADABA_DISTRICTS_GUIDE: DistrictInfo[] = [
  {
    name: 'الحي الأول',
    tagline: 'الأقرب لكارفور المعادي ومطلع الطريق الدائري ونفق الزهراء',
    desc: 'البوابة الرئيسية للهضبة الوسطى من اتجاه المعادي والدائري. يتميز بأعلى كثافة خدمات وسرعة إشغال سكني وتجاري، مع سهولة فائقة في الدخول والخروج دون المرور داخل عمق الهضبة.',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    locationDetails: 'ملاصق لمجمع كارفور المعادي، ومطلع الطريق الدائري باتجاه التجمع والمعادي، ومحور المشير طنطاوي ونفق زهراء المعادي.',
    avgMeterFinished: '22,500 - 25,500 ج.م',
    avgMeterSemi: '18,500 - 21,000 ج.م',
    keyLandmarks: ['كارفور المعادي', 'نادي الصيد (فرع القطامية/الهضبة)', 'مدرسة البشائر الدولية', 'مسجد الإيمان وميدان النافورة'],
    mainRoads: ['الطريق الدائري', 'محور المشير طنطاوي', 'نفق زهراء المعادي'],
    advantages: ['موقع استراتيجي على أطراف الهضبة بدون زحام داخلي', 'أعلى سيولة إعادة بيع (ريسيل) وسرعة تأجير', 'توافر كامل للغاز الطبيعي والمصاعد والكهرباء الرسمية'],
    propertyTypesFocus: 'شقق ٣ غرف وريسبشن ٣ قطع، وشقق غرفتين للمتزوجين الجدد',
    investmentRating: 5,
    residentialRating: 4.8
  },
  {
    name: 'الحي الثاني',
    tagline: 'أرقى أحياء الهضبة وأكثرها تنظيماً وعمراناً وواجهات فاخرة',
    desc: 'يعتبر الواجهة الأرقى للهضبة الوسطى بفضل التخطيط العمراني المتميز وعرض الشوارع (15م إلى 25م) وندرة العشوائية، وغالبية الأراضي مخصصة لنقابات وهيئات مع واجهات حجر هاشمي كلاسيكية.',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    locationDetails: 'يقع مباشرة بمحاذاة محور حسب الله الكفراوي ومدرسة منارة المستقبل والمعهد العالي للهندسة والتكنولوجيا.',
    avgMeterFinished: '23,000 - 26,500 ج.م',
    avgMeterSemi: '19,500 - 22,500 ج.م',
    keyLandmarks: ['مدرسة منارة المستقبل', 'المعهد العالي للهندسة والتكنولوجيا', 'كمبوندات أراضي النقابات', 'شارع المدارس الرئيسي'],
    mainRoads: ['محور حسب الله الكفراوي', 'شارع الجامعة', 'طريق المقطم المركزي'],
    advantages: ['شوارع عريضة وواجهات راقية جداً بحجر هاشمي ومداخل رخام', 'توافر جراجات خاصة مسجلة بحصة في الأرض لمعظم العمارات', 'مجتمع سكني عائلي هادئ جداً ومرتفع المستوى'],
    propertyTypesFocus: 'شقق عائلية كبيرة (140 إلى 180 م²) ودوبلكس أرضي بحديقة',
    investmentRating: 4.9,
    residentialRating: 5
  },
  {
    name: 'الحي الثالث',
    tagline: 'قلب الهضبة الوسطى الجغرافي وسهولة التحرك لكافة المحاور',
    desc: 'موقع وسطي استراتيجي يربط شمال وجنوب الهضبة الوسطى، ويقع بين شارع الجامعة الحيوي ومحور سميرة موسى، ويتميز بوجود مساحات خضراء وميادين منظمة.',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    locationDetails: 'يقع في قلب الهضبة بين الحي الثاني والرابع، متصلاً بميدان التقوى ومحور حسب الله الكفراوي.',
    avgMeterFinished: '21,500 - 24,000 ج.م',
    avgMeterSemi: '18,000 - 20,500 ج.م',
    keyLandmarks: ['مسجد التقوى وميدان الحي الثالث', 'حدائق الحي الثالث المركزية', 'مدارس رويال الدولية', 'سوبرماركت ومخابز راقية'],
    mainRoads: ['محور سميرة موسى', 'محور حسب الله الكفراوي', 'الشارع التجاري الفاصل'],
    advantages: ['موقع متوازن يجمع بين الهدوء السكني والقرب من الخدمات', 'أسعار متوازنة مع إمكانية إيجاد تسهيلات قصيرة في بعض وحدات الريسيل', 'عمارات حديثة البناء بمعايير إنشائية متطورة'],
    propertyTypesFocus: 'شقق ٣ غرف متوسطة وكبيرة (130 - 165 م²)',
    investmentRating: 4.6,
    residentialRating: 4.7
  },
  {
    name: 'الحي الرابع',
    tagline: 'المركز التجاري والخدمي والحيوي الأكبر بالهضبة الوسطى',
    desc: 'عصب الحياة اليومية والخدمات بالهضبة، يضم أكبر تجمع للعلامات التجارية والسوبرماركت والبنوك والعيادات الطبية والصيدليات الكبرى، مما يجعله الخيار المفضل للراغبين في القرب من كل شيء مشياً على الأقدام.',
    imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
    locationDetails: 'يمتد على الشارع التجاري الرئيسي الفاصل بين الأحياء 2 و3 و4 و5.',
    avgMeterFinished: '22,000 - 24,500 ج.م',
    avgMeterSemi: '18,500 - 21,000 ج.م',
    keyLandmarks: ['سوبرماركت سعودي وراية وخير زمان', 'مجمع عيادات الحي الرابع والمختبر والبرج', 'فروع بنوك مصر والأهلي وCIB', 'كافيهات ومطاعم المقطم'],
    mainRoads: ['الشارع التجاري الرئيسي', 'محور الكفراوي', 'شارع متولي الشعراوي'],
    advantages: ['كل الخدمات اليومية على بعد خطوات دون الحاجة لسيارة', 'تنوع هائل في مساحات الشقق (من 100م إلى 170م)', 'طلب استئجاري وسكني لا يتوقف على مدار العام'],
    propertyTypesFocus: 'شقق غرفتين و٣ غرف مناسبة للعرائس والعائلات',
    investmentRating: 4.8,
    residentialRating: 4.5
  },
  {
    name: 'الحي الخامس',
    tagline: 'ملاصق للأوتوستراد ونادي إيزي سبورت وميدان المقطم',
    desc: 'يتميز بقربه المباشر من طريق الأوتوستراد وسهولة التحرك لمدينة نصر ومصر الجديدة والقلعة ومصر القديمة، ويتمتع بارتفاع جغرافي وإطلالات بحرية مفتوحة على القاهرة.',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    locationDetails: 'الجهة الغربية للهضبة الوسطى، ملاصق لطريق الأوتوستراد ونادي إيزي سبورت ونفق السيدة عائشة وصلاح سالم.',
    avgMeterFinished: '22,500 - 25,500 ج.م',
    avgMeterSemi: '19,000 - 22,000 ج.م',
    keyLandmarks: ['نادي إيزي سبورت الرياضي', 'مستشفى المقطم التخصصي', 'ميدان النافورة ومطلع الهضبة العليا', 'مدارس الرواد للغات'],
    mainRoads: ['طريق الأوتوستراد', 'طريق صلاح سالم', 'محور الشهيد'],
    advantages: ['أقرب نقطة للهضبة إلى وسط البلد وصلاح سالم ومدينة نصر', 'إطلالات بحرية وهوائية رائعة بفضل الارتفاع الطبيعي', 'عمارات جديدة بتصميمات مودرن'],
    propertyTypesFocus: 'شقق ٣ غرف نوم بفيو بحري مفتوح وبنتهاوس',
    investmentRating: 4.7,
    residentialRating: 4.8
  },
  {
    name: 'الحي السادس',
    tagline: 'منطقة الجامعة الحديثة MTI وأعلى عائد إيجاري واستثماري',
    desc: 'الوجهة الاستثمارية الأولى بالهضبة بفضل احتضانه للحرم الرئيسي للجامعة الحديثة للتكنولوجيا والمعلومات (MTI)، مما يخلق طلباً هائلاً ومستمراً على استئجار الشقق من الطلاب والأساتذة والأطباء بعوائد سنوية تفوق 10-12%.',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    locationDetails: 'يحيط بالجامعة الحديثة وشارع الجامعة التجاري الممتد حتى الطريق الدائري.',
    avgMeterFinished: '21,500 - 24,000 ج.م',
    avgMeterSemi: '18,000 - 20,500 ج.م',
    keyLandmarks: ['الجامعة الحديثة للتكنولوجيا والمعلومات (MTI)', 'مكتبات ومراكز خدمات طلابية', 'شارع الجامعة التجاري الحيوي', 'مستشفى MTI التعليمي'],
    mainRoads: ['شارع الجامعة الرئيسي', 'محور الكفراوي', 'مطلع الدائري الأوسط'],
    advantages: ['أعلى عائد استثماري إيجاري بالهضبة الوسطى بالكامل', 'إمكانية تقسيم الشقق لتأجير غرف مفروشة لطلاب الجامعة', 'توافر حركة تجارية وتوصيل وخدمات على مدار 24 ساعة'],
    propertyTypesFocus: 'شقق غرفتين و٣ غرف مناسبة جداً للسكن والاستثمار الإيجاري',
    investmentRating: 5,
    residentialRating: 4.4
  },
  {
    name: 'الحي السابع',
    tagline: 'أرقى أحياء الهضبة هدوءاً وانخفاضاً للكثافة وإطلالات الحدائق',
    desc: 'الحي الأرقى لمن يبحث عن الخصوصية المطلقة والهدوء التام بعيداً عن صخب الشوارع التجارية، ويضم فيلات وعمارات فاخرة ذات طابع معماري أوروبي وقرب مباشر من محور الحضارات الجديد.',
    imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80',
    locationDetails: 'الجهة الجنوبية الغربية للهضبة، بالقرب من محور الحضارات ومتحف الحضارة والدائري.',
    avgMeterFinished: '24,000 - 27,500 ج.م',
    avgMeterSemi: '20,500 - 23,500 ج.م',
    keyLandmarks: ['كمبوندات الفيلات الفاخرة', 'حدائق الحي السابع المفتوحة', 'قربه من محور الحضارات وبحيرة عين الصيرة', 'نوادي رياضية خاصة'],
    mainRoads: ['محور الحضارات الجديد', 'الطريق الدائري', 'محور حسب الله الكفراوي'],
    advantages: ['أقل كثافة سكانية وأعلى نسبة مساحات خضراء وحدائق', 'واجهات عمارات فندقية حديثة وتشطيبات حجر ورخام مستورد', 'حصة جراج ومخزن مؤكدة لمعظم الوحدات'],
    propertyTypesFocus: 'شقق بمساحات واسعة (160 - 220 م²) وبنتهاوس بروف خاص',
    investmentRating: 4.9,
    residentialRating: 5
  },
  {
    name: 'الحي الثامن',
    tagline: 'الامتداد العمراني الأحدث وشبكة شوارع ومحاور عصرية',
    desc: 'أحدث أحياء الهضبة الوسطى تخطيطاً وإنشاءً، يتميز بعمارات مبنية حديثاً وفق أحدث كودات البناء وتوفير جراجات هيدروليكية ومصاعد ذكية ومداخل رخام مستورد مع أسعار تنافسية.',
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    locationDetails: 'الجهة الشرقية الشمالية للهضبة، مدخل سريع على محور الشهيد والأوتوستراد وميدان المقطم.',
    avgMeterFinished: '20,500 - 23,500 ج.م',
    avgMeterSemi: '17,500 - 20,000 ج.م',
    keyLandmarks: ['ميدان الحي الثامن الجديد', 'مجمعات إسكان حديثة راقية', 'مجمع مدارس تجريبية ولغات', 'إطلالات على محور الشهيد ومصر الجديدة'],
    mainRoads: ['محور الشهيد', 'طريق الأوتوستراد', 'محور سميرة موسى'],
    advantages: ['أحدث مباني الهضبة بنية تحتية وشبكات صرف وكهرباء جديدة', 'فرص ممتازة لاقتناص شقق بأسعار أقل مقارنة بالأحياء القديمة', 'نمو سعري سريع ومستقبل استثماري واعد جداً'],
    propertyTypesFocus: 'شقق ٣ غرف نصف تشطيب وتشطيب كامل مودرن',
    investmentRating: 4.8,
    residentialRating: 4.6
  },
  {
    name: 'تقسيم المباحث',
    tagline: 'الموقع الاستراتيجي الأبرز أمام كمبوند نكست بوينت وبجوار دائري المعادي ومحور الكفراوي',
    desc: 'منطقة حيوية ذات طلب متزايد تتميز بقربها المباشر من الطريق الدائري، كمبوند نكست بوينت، ومحور حسب الله الكفراوي، مع سهولة فائقة في الوصول إلى كارفور المعادي والقاهرة الجديدة.',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    locationDetails: 'أرض المباحث، أمام كمبوند Next Point مباشرةً، ٣٠ ثانية من دائري المعادي ومحور حسب الله الكفراوي.',
    avgMeterFinished: '20,000 - 23,000 ج.م',
    avgMeterSemi: '17,000 - 19,500 ج.م',
    keyLandmarks: ['كمبوند Next Point', 'دائري المعادي', 'محور حسب الله الكفراوي', 'أبراج تقسيم المباحث الحديثة'],
    mainRoads: ['الطريق الدائري', 'محور حسب الله الكفراوي', 'شارع النادي'],
    advantages: ['موقع مباشر ومفتوح على أهم محاور القاهرة', 'قرب فائق من كارفور المعادي والتجمع', 'عمارات حديثة ومصاعد وتصالحات قانونية'],
    propertyTypesFocus: 'شقق سكنية عائلية واستثمارية بمساحات 95م إلى 180م²',
    investmentRating: 4.8,
    residentialRating: 4.6
  }
];

export const HADABA_HIGHWAYS_DATA: HighwayInfo[] = [
  {
    name: 'محور حسب الله الكفراوي',
    description: 'شريان الهضبة الرئيسي الذي يربط جنوب وشرق الهضبة بالمعادي والأوتوستراد ومحور المشير ومحور الشهيد بدون أي إشارات مرورية.',
    destinations: 'المعادي · زهراء المعادي · التجمع · مدينة نصر',
    travelTime: '٥ - ٨ دقائق إلى المعادي ومدينة نصر'
  },
  {
    name: 'محور سميرة موسى',
    description: 'محور عملاق معلق يربط الهضبة الوسطى مباشرة بالقاهرة الجديدة وشارع التسعين والتجمع الخامس ومصر الجديدة.',
    destinations: 'التجمع الخامس · التسعين الجنوبي · محور المشير · المطار',
    travelTime: '١٠ دقائق إلى التجمع الخامس وشارع التسعين'
  },
  {
    name: 'محور الحضارات (عين الصيرة)',
    description: 'يربط الهضبة الوسطى والحيين الخامس والسابع بمتحف الحضارة والفسطاط وكورنيش النيل ووسط البلد ومصر القديمة.',
    destinations: 'متحف الحضارة · وسط البلد · المنيل · كورنيش النيل',
    travelTime: '٦ - ٩ دقائق إلى وسط البلد والنيل'
  },
  {
    name: 'الطريق الدائري ونفق الزهراء',
    description: 'المدخل الجنوبي المباشر عند الحي الأول وكارفور المعادي للوصول إلى الجيزة والمعادي والمعراج وشرق القاهرة.',
    destinations: 'المعراج · المعادي · المنيب · التجمع',
    travelTime: 'دقيقتان من الحي الأول إلى الدائري'
  },
  {
    name: 'طريق الأوتوستراد وصلاح سالم',
    description: 'المنفذ الغربي عند الحي الخامس والثامن للتحرك السريع نحو مدينة نصر، العباسية، مصر الجديدة ومطار القاهرة الدولي.',
    destinations: 'مدينة نصر · مصر الجديدة · القلعة · العاصمة الإدارية',
    travelTime: '١٢ دقيقة إلى مدينة نصر ومصر الجديدة'
  }
];

export const HADABA_LANDMARKS_CATEGORIES: LandmarkCategory[] = [
  {
    category: 'الجامعات والتعليم والمدارس الدولية',
    items: [
      { name: 'الجامعة الحديثة للتكنولوجيا والمعلومات (MTI)', district: 'الحي السادس', desc: 'صرح تعليمي يضم كليات الطب، الأسنان، الصيدلة، الهندسة، والإعلام.' },
      { name: 'مدرسة البشائر الدولية للغات', district: 'الحي الأول', desc: 'من كبرى المدارس الدولية في الهضبة والمنطقة المحيطة.' },
      { name: 'مدرسة منارة المستقبل للغات', district: 'الحي الثاني', desc: 'مجمع تعليمي راقي يخدم سكان الأحياء الثاني والثالث والأول.' },
      { name: 'المعهد العالي للهندسة والتكنولوجيا', district: 'الحي الثاني', desc: 'مؤسسة هندسية وتكنولوجية متخصصة ومعتمدة.' },
      { name: 'مدارس الرواد ورويال ومانور هاوس', district: 'الحي الخامس والثالث', desc: 'مدارس لغات متميزة بكافة المراحل التعليمية.' }
    ]
  },
  {
    category: 'التسوق والمولات والمراكز التجارية',
    items: [
      { name: 'كارفور المعادي سيتي سنتر', district: 'ملاصق للحي الأول', desc: 'أضخم مركز تجاري وتسوق ترفيهي وسينمات ومطاعم بجوار الهضبة.' },
      { name: 'سوبرماركت سعودي & راية & خير زمان', district: 'الحي الرابع', desc: 'سلاسل الهايبرماركت الكبرى لشراء مستلزمات الأسرة على مدار الساعة.' },
      { name: 'الشارع التجاري وشارع الجامعة', district: 'بين الأحياء 4 و 6', desc: 'تجمع لأشهر الكافيهات، المطاعم، فروع البنوك، والصيدليات الكبرى.' }
    ]
  },
  {
    category: 'النوادي والرياضة والخدمات الطبية',
    items: [
      { name: 'نادي الصيد المصري (فرع القطامية/الهضبة)', district: 'قرب الحي الأول', desc: 'نادي اجتماعي ورياضي عريق يضم ملاعب وأنشطة للأعضاء.' },
      { name: 'نادي إيزي سبورت الرياضي (Easy Sports)', district: 'الحي الخامس', desc: 'نادي رياضي متكامل بحمامات سباحة وملاعب كرة قدم وجيم مجهز.' },
      { name: 'مستشفى المقطم التخصصي ومراكز عيادات MTI', district: 'الحي الخامس والسادس', desc: 'خدمات طوارئ وعيادات تخصصية ومعامل تحاليل على مدار 24 ساعة.' }
    ]
  }
];

export const HADABA_LEGAL_TIPS: LegalTip[] = [
  {
    title: 'التأكد من حصة الأرض المسجلة في العقد',
    description: 'في شقق الهضبة الوسطى، يجب أن ينص العقد بوضوح على حصة شائعة في كامل مساحة أرض العقار بنسبة مساحة الشقة إلى إجمالي مسطح العمارة.',
    iconType: 'shield'
  },
  {
    title: 'رخصة المباني وموقف التصالح في الجهاز',
    description: 'تأكد من أن الدور الذي تقع فيه الشقة مرخص من جهاز المقطم، أو أنه تم سداد جدية ونموذج التصالح (نموذج 3 أو نموذج 10 النهائي) في حال الأدوار الإضافية.',
    iconType: 'document'
  },
  {
    title: 'العدادات الرسمية (كهرباء وغاز ومياه)',
    description: 'تأكد من وجود عداد كهرباء رسمي (كودي أو قديم باسم المالك) وتوفر خطوط الغاز الطبيعي وعداد المياه الرسمي دون أي مديونيات أو متأخرات سابقة.',
    iconType: 'check'
  },
  {
    title: 'تسلسل الملكية وصحة التوقيع والتسجيل',
    description: 'اطلب الاطلاع على العقد الأصلي للمالك وسند ملكية الأرض من جهاز مدينة المقطم أو النقابة المخصصة لها الأرض، وإجراء صحة توقيع أو تسجيل رسمي بعد الشراء.',
    iconType: 'alert'
  }
];

export const INITIAL_PROPERTIES_DATA: Property[] = [
  // 1. الحي الأول - متشطب سوبر لوكس - ٣ غرف
  {
    id: 'prop-wst-101',
    code: 'SEBA-RSL-101',
    title: 'شقة ريسيل ألترا سوبر لوكس بحري - الحي الأول قرب الدائري وكارفور',
    titleEn: 'Ultra Super Lux 3-Bed Apartment - 1st District',
    neighborhood: 'الحي الأول',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'finished',
    finishingLabel: 'متشطب بالكامل (ألترا سوبر لوكس)',
    price: 3650000,
    pricePerMeter: 22800,
    area: 160,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثالث',
    totalFloors: 5,
    view: 'واجهة بحري صريحة على شارع 20م وحديقة مفتوحة',
    deliveryDate: 'استلام فوري (جاهزة للسكن)',
    paymentMethod: 'cash',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'أرضيات بورسلين إسباني مستورد بالكامل',
      'ديكورات جبسمبورد وإضاءات ليد حديثة',
      'أطقم حمامات ديورافيت وخلاطات جروهي أصلية',
      'مطبخ ألوميتال خشمونيوم كبير ببلت إن',
      'عداد كهرباء رسمي + عداد غاز طبيعي راكب',
      'عمارة شيك ومدخل رخام ومصعد إيطالي حديث'
    ],
    description: 'شقة ممتازة جداً بموقع حيوي واستراتيجي بالحي الأول الهضبة الوسطى، دقيقتين من كارفور المعادي ومطلع الطريق الدائري ومحور المشير. ريسبشن 3 قطع واسع بتراس بحري رائع، 3 غرف نوم مريحة منها ماستر، مطبخ واسع وحمامين كاملين.',
    ownerName: 'المهندس أحمد شكري',
    ownerPhone: '01012345678',
    isFeatured: true,
    hasElevator: true,
    hasGarage: true,
    registeredContract: true,
    createdAt: '2026-03-01',
    clicks: { whatsapp: 42, call: 19, views: 320, favorites: 28 }
  },

  // 2. الحي الأول - نصف تشطيب - غرفتين
  {
    id: 'prop-wst-102',
    code: 'SEBA-RSL-102',
    title: 'شقة غرفتين ريسيل نصف تشطيب بسعر لقطة - الحي الأول موقع مميز',
    titleEn: '2-Bed Semi-Finished Apartment - 1st District',
    neighborhood: 'الحي الأول',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'semi_finished',
    finishingLabel: 'نصف تشطيب (محارة وحلوق وسباكة)',
    price: 2450000,
    pricePerMeter: 20400,
    area: 120,
    bedrooms: 2,
    bathrooms: 2,
    floor: 'الدور الثاني',
    totalFloors: 5,
    view: 'شارع هادئ واجهة شرقية مشمسة',
    deliveryDate: 'استلام فوري',
    paymentMethod: 'cash',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'تأسيس سباكة بي ار ألماني بضمان معتمد',
      'تأسيس كهرباء سويدي أصلي بالكامل',
      'حلوق خشب موسكي راكبة ومحارة ممتازة بؤج وأوتار',
      'باب شقة مصفح تركي عالي الأمان',
      'حصة جراج قانونية ومخزن خاص بالعمارة'
    ],
    description: 'فرصة سكنية واستثمارية نادرة بالحي الأول، شقة غرفتين نوم وريسبشن قطعتين كبير ومطبخ أمريكان وحمامين، جاهزة تماماً للتشطيب النهائي حسب ذوق المشتري. عمارة حديثة ساكنة بالكامل.',
    ownerName: 'المالك المباشر',
    ownerPhone: '01000000000',
    isFeatured: false,
    hasElevator: true,
    hasGarage: true,
    registeredContract: true,
    createdAt: '2026-03-02',
    clicks: { whatsapp: 28, call: 14, views: 240, favorites: 15 }
  },

  // 3. الحي الثاني - متشطب سوبر لوكس - ٣ غرف
  {
    id: 'prop-wst-201',
    code: 'SEBA-RSL-201',
    title: 'شقة فاخرة ٣ غرف متشطبة بالكامل أول سكن - الحي الثاني أرقى موقع',
    titleEn: 'Finished 3-Bed Apartment - 2nd District',
    neighborhood: 'الحي الثاني',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'finished',
    finishingLabel: 'متشطب بالكامل (سوبر لوكس فندقي)',
    price: 3950000,
    pricePerMeter: 24680,
    area: 160,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثالث',
    totalFloors: 5,
    view: 'واجهة مفتوحة فيو ميدان وحديقة مشجرة',
    deliveryDate: 'استلام فوري',
    paymentMethod: 'cash',
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'تشطيب حديث لم تسكن من قبل',
      'باركيه ألماني في الغرف وبورسلين في الريسبشن',
      'مطبخ راكب بالأجهزة والشفاط الإيطالي',
      'موقع هادئ جداً قرب المدارس الدولية والخدمات',
      'مصعد يعمل بانتظام مع صيانة دورية'
    ],
    description: 'شقة راقية جداً في قلب الحي الثاني، تتميز بالهدوء الشديد وقربها من شارع الجامعة والخدمات ومحور حسب الله الكفراوي. تقسيم مثالي: ريسبشن 3 قطع + 3 غرف نوم + 2 حمام.',
    ownerName: 'د/ محمود عزت',
    ownerPhone: '01234567890',
    isFeatured: true,
    hasElevator: true,
    hasGarage: true,
    registeredContract: true,
    createdAt: '2026-03-03',
    clicks: { whatsapp: 55, call: 31, views: 410, favorites: 39 }
  },

  // 4. الحي الثالث - نصف تشطيب - ٣ غرف
  {
    id: 'prop-wst-301',
    code: 'SEBA-RSL-301',
    title: 'شقة ٣ غرف نصف تشطيب بمساحة ١٥٥ م² - الحي الثالث بموقع استراتيجي',
    titleEn: '3-Bed Semi-Finished 155m - 3rd District',
    neighborhood: 'الحي الثالث',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'semi_finished',
    finishingLabel: 'نصف تشطيب (محارة وحلوق وسباكة)',
    price: 3100000,
    pricePerMeter: 20000,
    area: 155,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثاني',
    totalFloors: 5,
    view: 'شارع عريض 18م واجهة بحري غربي',
    deliveryDate: 'استلام فوري',
    paymentMethod: 'cash_or_facilities',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'عمارة مبنية حديثاً وساكنة',
      'عداد كهرباء رسمي وحصة بالأرض',
      'واجهة حجر هاشمي كلاسيكية فخمة',
      'تقسيم هندسي بدون إهدار مساحات'
    ],
    description: 'شقة مميزة بالحي الثالث الهضبة الوسطى، قريبة من محور الكفراوي ومسجد التقوى. ريسبشن واسع يتسع لـ 3 قطع مريحة، 3 غرف نوم بمقاسات ممتازة وحمام ضيوف وحمام رئيسي.',
    ownerName: 'أ/ عصام النجار',
    ownerPhone: '01098765432',
    isFeatured: false,
    hasElevator: true,
    hasGarage: true,
    registeredContract: true,
    createdAt: '2026-03-03',
    clicks: { whatsapp: 34, call: 18, views: 265, favorites: 19 }
  },

  // 5. الحي الرابع - متشطب سوبر لوكس - غرفتين
  {
    id: 'prop-wst-401',
    code: 'SEBA-RSL-401',
    title: 'شقة غرفتين متشطبة بالكامل أول سكن - الحي الرابع قرب المحلات والخدمات',
    titleEn: 'Finished 2-Bed Apartment - 4th District',
    neighborhood: 'الحي الرابع',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'finished',
    finishingLabel: 'متشطب بالكامل (سوبر لوكس مودرن)',
    price: 2850000,
    pricePerMeter: 23750,
    area: 120,
    bedrooms: 2,
    bathrooms: 2,
    floor: 'الدور الأول فوق الأرضي',
    totalFloors: 5,
    view: 'شارع رئيسي وحديقة',
    deliveryDate: 'استلام فوري',
    paymentMethod: 'cash',
    images: [
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'تشطيب حديث سوبر لوكس وإضاءات مخفية',
      'أرضيات سيراميك فرز أول كليوباترا',
      'حمامات مجهزة ومطبخ مفتوح واسع',
      'موقع مميز بالحي الرابع بالقرب من كبرى الخدمات'
    ],
    description: 'شقة غرفتين جاهزة للسكن الفوري بالحي الرابع، ريسبشن قطعتين كبير، 2 غرف نوم واسعة، حمامين ومطبخ. مناسبة جداً للعرائس أو الاستثمار العقاري للإيجار الفوري.',
    ownerName: 'أ/ خالد فوزي',
    ownerPhone: '01511223344',
    isFeatured: true,
    hasElevator: true,
    hasGarage: false,
    registeredContract: true,
    createdAt: '2026-03-04',
    clicks: { whatsapp: 39, call: 22, views: 290, favorites: 24 }
  },

  // 6. الحي الخامس - متشطب سوبر لوكس - ٣ غرف
  {
    id: 'prop-wst-501',
    code: 'SEBA-RSL-501',
    title: 'شقة ٣ غرف ريسبشن ٣ قطع - الحي الخامس قرب نادي الصيد والأوتوستراد',
    titleEn: '3-Bed Super Lux Apartment - 5th District',
    neighborhood: 'الحي الخامس',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'finished',
    finishingLabel: 'متشطب بالكامل (سوبر لوكس)',
    price: 3800000,
    pricePerMeter: 23750,
    area: 160,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثالث',
    totalFloors: 5,
    view: 'واجهة بحري فيو مفتوح',
    deliveryDate: 'استلام فوري',
    paymentMethod: 'cash',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'تشطيب دهانات جوتن وديكورات بديل خشب ورخام',
      'سباكة وكهرباء معتمدة وشبابيك بي في سي عازلة للصوت',
      'غاز طبيعي وتليفون أرضي وكهرباء راكبين',
      'عمارة راقية جداً وسكان محترمين'
    ],
    description: 'شقة عائلية متكاملة بالحي الخامس الهضبة الوسطى، موقع مميز بالقرب من المحاور وسهولة التحرك إلى المعادي ومدينة نصر والتجمع. 3 غرف نوم واسعة وريسبشن 3 قطع.',
    ownerName: 'أ/ سمير علام',
    ownerPhone: '01002233445',
    isFeatured: true,
    hasElevator: true,
    hasGarage: true,
    registeredContract: true,
    createdAt: '2026-03-04',
    clicks: { whatsapp: 48, call: 25, views: 370, favorites: 32 }
  },

  // 7. الحي السادس - نصف تشطيب - غرفتين
  {
    id: 'prop-wst-601',
    code: 'SEBA-RSL-601',
    title: 'شقة غرفتين نصف تشطيب استلام فوري - الحي السادس دقيقتين من الجامعة الحديثة MTI',
    titleEn: '2-Bed Semi-Finished - 6th District',
    neighborhood: 'الحي السادس',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'semi_finished',
    finishingLabel: 'نصف تشطيب (محارة وحلوق وسباكة)',
    price: 2350000,
    pricePerMeter: 20430,
    area: 115,
    bedrooms: 2,
    bathrooms: 1,
    floor: 'الدور الثاني',
    totalFloors: 5,
    view: 'شارع هادئ مشجر',
    deliveryDate: 'استلام فوري',
    paymentMethod: 'cash',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'موقع استثماري عالي الطلب للإيجار قرب الجامعة',
      'تأسيس سباكة وكهرباء ممتاز',
      'عمارة شيك ومصعد راكب ويعمل',
      'حصة في الأرض ورخصة قانونية'
    ],
    description: 'شقة غرفتين مميزة للاستثمار والسكن بالحي السادس قرب الجامعة الحديثة MTI وشارع الجامعة الحيوي. ريسبشن قطعتين + 2 غرف نوم + حمام ومطبخ.',
    ownerName: 'أ/ هاني مراد',
    ownerPhone: '01223344556',
    isFeatured: false,
    hasElevator: true,
    hasGarage: false,
    registeredContract: true,
    createdAt: '2026-03-05',
    clicks: { whatsapp: 31, call: 16, views: 250, favorites: 18 }
  },

  // 8. الحي السابع - متشطب سوبر لوكس - ٣ غرف
  {
    id: 'prop-wst-701',
    code: 'SEBA-RSL-701',
    title: 'شقة ٣ غرف ألترا سوبر لوكس فيو حديقة - الحي السابع الهادئ الأرقى معمارياً',
    titleEn: '3-Bed Ultra Lux 170m - 7th District',
    neighborhood: 'الحي السابع',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'finished',
    finishingLabel: 'متشطب بالكامل (ألترا سوبر لوكس)',
    price: 4100000,
    pricePerMeter: 24100,
    area: 170,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثالث',
    totalFloors: 5,
    view: 'واجهة بحري صريحة بانوراما على حديقة كبيرة',
    deliveryDate: 'استلام فوري',
    paymentMethod: 'cash',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'تشطيب مهندس ديكور خامات فاخرة بالكامل',
      'ريسبشن 3 قطع كبير مع تراس بانورامي',
      '3 غرف نوم مساحات واسعة منها غرفة ماستر',
      'حصة جراج مسجلة بالعقد + مخزن',
      'حراسة وأمن وإنتركم مرئي'
    ],
    description: 'شقة استثنائية لعشاق المساحات والخصوصية بالحي السابع أرقى وأهدأ أحياء الهضبة الوسطى. تشطيب على أعلى مستوى لا يحتاج أي مصروف إطلاقاً.',
    ownerName: 'المستشار شريف سامي',
    ownerPhone: '01055667788',
    isFeatured: true,
    hasElevator: true,
    hasGarage: true,
    registeredContract: true,
    createdAt: '2026-03-05',
    clicks: { whatsapp: 62, call: 38, views: 490, favorites: 45 }
  },

  // 9. الحي الثامن - نصف تشطيب - ٣ غرف
  {
    id: 'prop-wst-801',
    code: 'SEBA-RSL-801',
    title: 'شقة ٣ غرف نصف تشطيب موقع متميز - الحي الثامن قرب المحاور والشهيد',
    titleEn: '3-Bed Semi-Finished - 8th District',
    neighborhood: 'الحي الثامن',
    propertyType: 'apartment',
    propertyTypeLabel: 'شقة سكنية',
    finishing: 'semi_finished',
    finishingLabel: 'نصف تشطيب (محارة وحلوق وسباكة)',
    price: 3200000,
    pricePerMeter: 21330,
    area: 150,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثاني',
    totalFloors: 5,
    view: 'شارع رئيسي واجهة بحري',
    deliveryDate: 'استلام فوري',
    paymentMethod: 'cash_or_facilities',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ],
    features: [
      'عمارة حديثة بالكامل رخصة مباني قانونية',
      'مدخل رخام وجراج خاص ومصعد مستورد',
      'تأسيس كامل للسباكة والكهرباء',
      'قريبة جداً من محور الشهيد وميدان النافورة وطريق الأوتوستراد'
    ],
    description: 'شقة ريسيل ممتازة بالحي الثامن، 3 غرف نوم وريسبشن 3 قطع كبير وتراس، موقع واعد جداً ومستقبل استثماري ممتاز.',
    ownerName: 'أ/ وائل صبري',
    ownerPhone: '01144556677',
    isFeatured: true,
    hasElevator: true,
    hasGarage: true,
    registeredContract: true,
    createdAt: '2026-03-06',
    clicks: { whatsapp: 40, call: 21, views: 310, favorites: 26 }
  }
];

export const INITIAL_OWNER_SUBMISSIONS: OwnerSubmission[] = [
  {
    id: 'sub-001',
    ownerName: 'أ/ إبراهيم توفيق',
    phone: '01099887766',
    ownerPhone: '01099887766',
    whatsapp: '01099887766',
    neighborhood: 'الحي الثاني',
    unitType: 'apartment',
    area: 145,
    bedrooms: 3,
    bathrooms: 2,
    floor: 'الدور الثالث',
    finishing: 'finished',
    askingPrice: 3400000,
    price: 3400000,
    paymentMethod: 'cash',
    exactLocation: 'شارع مدرسة منارة المستقبل، عمارة 18، بالقرب من سنتر النور',
    googleMapsUrl: 'https://maps.google.com/?q=29.9880,31.3120',
    viewingSchedule: 'طوال أيام الأسبوع بعد الساعة 5 مساءً (أو الجمعة والسبت بعد العصر)',
    inspectionContactPhone: '01012345678',
    inspectionContactRole: 'حارس العقار (البواب)',
    unitDescription: 'شقة متشطبة سوبر لوكس بالحي الثاني بجوار مدرسة منارة المستقبل، ريسبشن قطعتين ونص، 3 غرف نوم مقفولة، حمامين ومطبخ جاهز، بحري بالكامل.',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'pending',
    submittedAt: '2026-03-07 11:30'
  },
  {
    id: 'sub-002',
    ownerName: 'م/ سامح عبد العظيم',
    phone: '01155443322',
    ownerPhone: '01155443322',
    whatsapp: '01155443322',
    neighborhood: 'الحي الرابع',
    unitType: 'apartment',
    area: 125,
    bedrooms: 2,
    bathrooms: 2,
    floor: 'الدور الأول',
    finishing: 'semi_finished',
    askingPrice: 2550000,
    price: 2550000,
    paymentMethod: 'cash',
    exactLocation: 'شارع الجامعة الحديثة، بجوار بنك مصر، المجاورة السابعة',
    viewingSchedule: 'الشقة خالية ومفتاحها متاح للمعاينة فوراً مع البواب',
    inspectionContactPhone: '01198765432',
    inspectionContactRole: 'حارس العقار (البواب)',
    unitDescription: 'شقة غرفتين نصف تشطيب بالحي الرابع، محارة ممتازة وسباكة راكبة، واجهة بحري، رخصة رسمية وحصة بالأرض.',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'pending',
    submittedAt: '2026-03-07 13:15'
  }
];

// Tag resale properties with category 'resale' if not specified
export const HADABA_WOSTA_RESALE_DATA: Property[] = [
  ...USER_EXCEL_PROPERTIES.map(p => ({ ...p, category: (p.category || 'resale') as 'resale' | 'off_plan' })),
  ...INITIAL_PROPERTIES_DATA.map(p => ({ ...p, category: (p.category || 'resale') as 'resale' | 'off_plan' }))
];

export { OFF_PLAN_PROPERTIES_DATA };

// Combined inventory: Resale apartments + Off-Plan standalone buildings & compounds
export const ALL_HADABA_PROPERTIES: Property[] = [
  ...OFF_PLAN_PROPERTIES_DATA,
  ...HADABA_WOSTA_RESALE_DATA
];

export const PROPERTIES_DATA: Property[] = ALL_HADABA_PROPERTIES;
