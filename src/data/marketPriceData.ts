import { ClosedDeal, NeighborhoodPriceMapData, HadabaWostaNeighborhood } from '../types';

export const INITIAL_PRICE_MAP_DATA: NeighborhoodPriceMapData[] = [
  {
    neighborhood: 'الحي الأول',
    avgFinishedPrice: 24500,
    avgSemiFinishedPrice: 18500,
    heatScore: 9,
    keyLandmarks: 'محور الشهيد · مدارس منارة المستقبل · بوابات المعادي',
    availableUnitsCount: 28
  },
  {
    neighborhood: 'الحي الثاني',
    avgFinishedPrice: 22000,
    avgSemiFinishedPrice: 16500,
    heatScore: 8,
    keyLandmarks: 'شارع كلية الصيدلة MTI · مدارس ريتاج · شارع مدرسة البارون',
    availableUnitsCount: 34
  },
  {
    neighborhood: 'الحي الثالث',
    avgFinishedPrice: 26000,
    avgSemiFinishedPrice: 19800,
    heatScore: 10,
    keyLandmarks: 'كمبوند فلورينتا · إيزي سبورتس كلوب · البنك الأهلي',
    availableUnitsCount: 22
  },
  {
    neighborhood: 'الحي الرابع',
    avgFinishedPrice: 19500,
    avgSemiFinishedPrice: 14800,
    heatScore: 6,
    keyLandmarks: 'جامعة MTI · سنتر النصر · دقائق من الدائري',
    availableUnitsCount: 19
  },
  {
    neighborhood: 'الحي الخامس',
    avgFinishedPrice: 21500,
    avgSemiFinishedPrice: 15800,
    heatScore: 7,
    keyLandmarks: 'نادي الصيد ومحور حسب الله الكفراوي الجديد',
    availableUnitsCount: 16
  },
  {
    neighborhood: 'الحي السادس',
    avgFinishedPrice: 18500,
    avgSemiFinishedPrice: 13900,
    heatScore: 5,
    keyLandmarks: 'محور سميرة موسى والربط مع التجمع الخامس',
    availableUnitsCount: 12
  },
  {
    neighborhood: 'الحي السابع',
    avgFinishedPrice: 18000,
    avgSemiFinishedPrice: 13500,
    heatScore: 4,
    keyLandmarks: 'هدوء عالي وقرب من دائري القطامية والمعادي',
    availableUnitsCount: 10
  },
  {
    neighborhood: 'الحي الثامن',
    avgFinishedPrice: 17500,
    avgSemiFinishedPrice: 13000,
    heatScore: 4,
    keyLandmarks: 'إطلالات مفتوحة وتوسعات استثمارية جديدة',
    availableUnitsCount: 8
  },
  {
    neighborhood: 'تقسيم المباحث',
    avgFinishedPrice: 19000,
    avgSemiFinishedPrice: 14200,
    heatScore: 6,
    keyLandmarks: 'بجوار كارفور المعادي ونادي وادي دجلة ومحور الكفراوي',
    availableUnitsCount: 25
  }
];

export const INITIAL_CLOSED_DEALS: ClosedDeal[] = [
  {
    id: 'deal-1',
    neighborhood: 'الحي الأول',
    area: 150,
    price: 3675000,
    daysToClose: 18,
    timeframeLabel: 'اتباعت الأسبوع ده',
    closedDate: '2026-09-12',
    notes: 'دور ثاني واجهة بحري - كاش'
  },
  {
    id: 'deal-2',
    neighborhood: 'الحي الثالث',
    area: 130,
    price: 3380000,
    daysToClose: 25,
    timeframeLabel: 'اتباعت من أسبوعين',
    closedDate: '2026-09-02',
    notes: 'تشطيب سوبر لوكس كمبوند فلورينتا'
  },
  {
    id: 'deal-3',
    neighborhood: 'تقسيم المباحث',
    area: 200,
    price: 3800000,
    daysToClose: 40,
    timeframeLabel: 'اتباعت الشهر ده',
    closedDate: '2026-08-25',
    notes: 'دور أول بلكونة مميزة'
  },
  {
    id: 'deal-4',
    neighborhood: 'الحي الثاني',
    area: 175,
    price: 3850000,
    daysToClose: 14,
    timeframeLabel: 'اتباعت الشهر ده',
    closedDate: '2026-08-18',
    notes: 'أرضي بحديقة خاصة مسجلة'
  },
  {
    id: 'deal-5',
    neighborhood: 'الحي الرابع',
    area: 120,
    price: 2340000,
    daysToClose: 22,
    timeframeLabel: 'اتباعت الشهر ده',
    closedDate: '2026-08-10',
    notes: 'نصف تشطيب استلام فوري'
  }
];

export interface ValuationParams {
  neighborhood: HadabaWostaNeighborhood;
  area: number;
  floorType: 'ground_garden' | 'floor_1_3' | 'floor_4_6' | 'higher';
  finishing: 'super_lux' | 'semi_finished';
  features: string[]; // 'elevator', 'garage', 'registered_contract', 'facade'
}

export interface ValuationResult {
  minPrice: number;
  maxPrice: number;
  avgMeterPrice: number;
  similarCount: number;
}

export function calculatePropertyValuation(
  params: ValuationParams,
  priceMapData: NeighborhoodPriceMapData[] = INITIAL_PRICE_MAP_DATA
): ValuationResult {
  const districtData = priceMapData.find(d => d.neighborhood === params.neighborhood) || priceMapData[0];
  
  let baseMeterPrice = params.finishing === 'super_lux' 
    ? districtData.avgFinishedPrice 
    : districtData.avgSemiFinishedPrice;

  // Floor adjustment
  if (params.floorType === 'ground_garden') {
    baseMeterPrice *= 1.08;
  } else if (params.floorType === 'floor_1_3') {
    baseMeterPrice *= 1.05; // prime floors
  } else if (params.floorType === 'higher') {
    baseMeterPrice *= 0.94; // high floor without roof
  }

  // Features adjustment
  if (params.features.includes('elevator')) baseMeterPrice += 400;
  if (params.features.includes('garage')) baseMeterPrice += 600;
  if (params.features.includes('registered_contract')) baseMeterPrice += 500;
  if (params.features.includes('facade')) baseMeterPrice += 300;

  const estimatedTotal = Math.round(baseMeterPrice * params.area);
  const minPrice = Math.round((estimatedTotal * 0.95) / 50000) * 50000;
  const maxPrice = Math.round((estimatedTotal * 1.06) / 50000) * 50000;

  return {
    minPrice,
    maxPrice,
    avgMeterPrice: Math.round(baseMeterPrice),
    similarCount: districtData.availableUnitsCount || 14
  };
}

export function getEstimatedAreaForBudget(
  budget: number,
  neighborhood: HadabaWostaNeighborhood,
  finishing: 'finished' | 'semi_finished' = 'finished',
  priceMapData: NeighborhoodPriceMapData[] = INITIAL_PRICE_MAP_DATA
): { area: number; availableCount: number } {
  const districtData = priceMapData.find(d => d.neighborhood === neighborhood) || priceMapData[0];
  const meterPrice = finishing === 'finished' ? districtData.avgFinishedPrice : districtData.avgSemiFinishedPrice;
  const area = Math.round(budget / (meterPrice || 20000));
  return {
    area: Math.max(70, Math.min(350, area)),
    availableCount: districtData.availableUnitsCount || 12
  };
}
