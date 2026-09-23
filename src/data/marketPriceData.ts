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

// بداية نضيفة: الصفقات الحقيقية بتتضاف من لوحة الإدارة
export const INITIAL_CLOSED_DEALS: ClosedDeal[] = [];

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
  } else if (params.floorType === 'floor_1_4') {
    baseMeterPrice *= 1.05; // الأدوار المتكررة المرخّصة
  } else if (params.floorType === 'floor_5_7') {
    baseMeterPrice -= 3000; // أدوار مخالفة للترخيص: أقل 3000 للمتر
  }

  // Features adjustment
  if (params.features.includes('elevator')) baseMeterPrice += 400;
  if (params.features.includes('garage')) baseMeterPrice += 600;
  if (params.features.includes('registered_contract')) baseMeterPrice += 500;
  if (params.features.includes('facade')) baseMeterPrice += 300;

  if (baseMeterPrice < 5000) baseMeterPrice = 5000;
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
