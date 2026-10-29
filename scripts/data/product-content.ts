/**
 * Product detail content transcribed from the packaging artwork (brand-assets/packaging/, not in Git).
 * Provenance per field (also written to each product's staff-only editorial note):
 * - PACKAGING: copied word for word from a pack panel (ko from Korean panels, en from English panels);
 * - TRANSLATION: translated by AI from the Korean packaging text (all vi; en claims);
 * - AI-PROPOSED: written by AI from packaging facts, not printed as such (shortDescription in all
 *   languages, and the vi product type words supplied by the client are kept as given).
 * Korean is the source language.
 * Nothing here is published by the import; see docs/product-content.md for the review checklist.
 * Consumer-service phone numbers and company details on the packs are deliberately left out.
 */

export type L = { ko: string; en: string; vi: string }
export type Claim = { text: L; source: string; note?: string }

export type ProductContent = {
  slug: string
  /** Open questions for the brand; go into the staff-only editorial note, never on the site. */
  issues?: string[]
  sourceFile: string
  shortDescription: L
  description: L
  claims: Claim[]
  howToUse: { ko: string[]; en: string[]; vi: string[] }
  cautions: { ko: string[]; en: string[]; vi: string[] }
  inci: string
  ingredients: string[]
  sources: Record<string, string>
}

export type IngredientContent = { slug: string; name: L; inciName: string }

const cautionsKoA = [
  '화장품 사용 시 또는 사용 후 직사광선에 의하여 사용부위가 붉은 반점, 부어오름 또는 가려움증 등의 이상 증상이나 부작용이 있는 경우에는 전문의 등과 상담할 것.',
  '상처가 있는 부위 등에는 사용을 자제할 것.',
  '보관 및 취급 시 주의사항: 어린이의 손이 닿지 않는 곳에 보관할 것. 직사광선을 피해서 보관할 것.',
]
const cautionsKoB = [
  '화장품 사용 시 또는 사용 후 직사광선에 의하여 사용부위가 붉은 반점, 부어오름 또는 가려움증 등의 이상 증상이나 부작용이 있는 경우에는 전문의 등과 상담하십시오.',
  '상처가 있는 부위 등에는 사용을 자제하십시오.',
  '보관 및 취급시 주의사항: 어린이의 손이 닿지 않는 곳에 보관하십시오. 직사광선을 피해서 보관하십시오.',
]
const cautionsEn = [
  'Discontinue use if irritation develops or increases. If irritation persists, consult a doctor or a health care practitioner.',
  'Avoid contact with eyes.',
  'Keep out of reach of children.',
  'Store in a cool, dry place away from sunlight.',
  'For external use only.',
]
const cautionsVi = [
  'Nếu trong hoặc sau khi sử dụng, vùng da dùng sản phẩm xuất hiện bất thường hoặc tác dụng phụ như đốm đỏ, sưng hay ngứa do ánh nắng trực tiếp, hãy tham khảo ý kiến bác sĩ chuyên khoa.',
  'Hạn chế sử dụng trên vùng da có vết thương.',
  'Lưu ý khi bảo quản và sử dụng: để xa tầm tay trẻ em; tránh ánh nắng trực tiếp.',
]

export const ingredients: IngredientContent[] = [
  { slug: 'pdrn', name: { ko: 'PDRN', en: 'PDRN', vi: 'PDRN' }, inciName: 'Sodium DNA' },
  { slug: 'milk-exosome', name: { ko: '우유엑소좀', en: 'Milk Exosome', vi: 'Exosome sữa' }, inciName: 'Milk Exosomes' },
  { slug: 'nmn', name: { ko: 'NMN', en: 'NMN', vi: 'NMN' }, inciName: 'Nicotinamide Mononucleotide' },
  { slug: 'nad', name: { ko: 'NAD+', en: 'NAD+', vi: 'NAD+' }, inciName: 'Nicotinamide Adenine Dinucleotide' },
  { slug: 'panthenol', name: { ko: '판테놀', en: 'Panthenol', vi: 'Panthenol' }, inciName: 'Panthenol' },
  {
    slug: 'centella-asiatica-leaf-water',
    name: { ko: '병풀잎수', en: 'Centella Asiatica Leaf Water', vi: 'Nước lá rau má' },
    inciName: 'Centella Asiatica Leaf Water',
  },
  { slug: 'egf', name: { ko: 'EGF', en: 'E.G.F', vi: 'EGF' }, inciName: 'sh-Oligopeptide-1' },
  {
    slug: 'sodium-hyaluronate',
    name: { ko: '소듐하이알루로네이트', en: 'Sodium Hyaluronate', vi: 'Sodium Hyaluronate' },
    inciName: 'Sodium Hyaluronate',
  },
  { slug: 'allantoin', name: { ko: '알란토인', en: 'Allantoin', vi: 'Allantoin' }, inciName: 'Allantoin' },
]

export const products: ProductContent[] = [
  {
    slug: 'rx-matrix-balm',
    sourceFile: 'rx-matrix-balm_box.pdf',
    sources: {
      ko: 'Hộp RX Matrix Balm (rx-matrix-balm_box.pdf), mặt sau tiếng Hàn và mặt bên [전성분]/[사용할 때의 주의사항]',
      en: 'Hộp RX Matrix Balm (rx-matrix-balm_box.pdf), mặt bên tiếng Anh',
      front: 'Hộp RX Matrix Balm, mặt trước: PDRN 20,000 ppm, MILK EXOSOME, NMN & NAD+, PEPTIDE COMPLEX, PANTHENOL 50,000 ppm',
    },
    shortDescription: {
      ko: '각종 펩타이드 컴플렉스와 판테놀이 고함유된 멀티 보습 케어 밤',
      en: 'A multi-moisturizing care balm enriched with various peptide complexes and Panthenol.',
      vi: 'Kem dưỡng dạng balm chăm sóc ẩm đa tác động, giàu phức hợp peptide và panthenol.',
    },
    description: {
      ko: '각종 펩타이드 컴플렉스와 보습에 도움을 주는 판테놀이 고함유된 닥터피넥스 알엑스 매트릭스 밤은 PDRN과 엑소좀 성분이 거칠고 자극 받은 피부를 촉촉하고 건강하게 만드는 데 도움을 주는 멀티 보습 케어 밤입니다.',
      en: 'Dr. PhynEX RX Matrix Balm is a multi-moisturizing care balm enriched with various peptide complexes and Panthenol, which helps provide moisture to the skin, along with PDRN and exosomes, leaving the skin feeling moisturized and refreshed.',
      vi: 'Dr. PhynEX RX Matrix Balm là kem dưỡng dạng balm chăm sóc ẩm đa tác động, chứa hàm lượng cao các phức hợp peptide và panthenol hỗ trợ dưỡng ẩm; thành phần PDRN và exosome giúp làn da khô ráp, bị kích ứng trở nên ẩm mịn và khỏe mạnh.',
    },
    claims: [
      {
        text: {
          ko: '피부의 미백 및 주름개선에 도움을 줍니다.',
          en: 'Helps brighten the skin and improve the appearance of wrinkles.',
          vi: 'Hỗ trợ làm sáng da và cải thiện nếp nhăn.',
        },
        source: 'rx-matrix-balm_box.pdf, mặt sau tiếng Hàn, mục [효능/효과]; hộp ghi "미백 및 주름개선 이중 기능성 화장품"',
        note: 'Công dụng của mỹ phẩm chức năng theo quy định Hàn Quốc. Cần đối chiếu với phiếu công bố tại Việt Nam trước khi hiển thị ở /vi.',
      },
    ],
    howToUse: {
      ko: ['아침 저녁으로 적당량을 덜어 건조한 부위에 두드려 흡수시켜 줍니다.', '본 품 적당량을 취해 피부에 골고루 펴 바릅니다.'],
      en: ['Apply a proper amount onto dry skin morning and evening.', 'Gently pat for full absorption.'],
      vi: [
        'Sáng và tối, lấy một lượng vừa đủ, thoa lên vùng da khô và vỗ nhẹ để sản phẩm thẩm thấu.',
        'Lấy một lượng sản phẩm vừa đủ và thoa đều lên da.',
      ],
    },
    cautions: { ko: cautionsKoA, en: cautionsEn, vi: cautionsVi },
    inci:
      'Water, Butylene Glycol, Caprylic/Capric Triglyceride, Cetyl Ethylhexanoate, Panthenol(50,000ppm), Hydrogenated Polyisobutene, Glycerin, Isohexadecane, Olea Europaea (Olive) Fruit Oil, Sodium DNA(20,000ppm), Niacinamide, Titanium Dioxide, Dimethicone, Glyceryl Stearate, PEG-100 Stearate, Sorbitan Sesquioleate, Cetyl PEG/PPG-10/1 Dimethicone, Cetearyl Alcohol, Euphorbia Cerifera (Candelilla) Wax, 1,2-Hexanediol, Chlorphenesin, Silica, Xanthan Gum, Sodium Chloride, Ethylhexylglycerin, Maltodextrin, Caramel, Adenosine, Fragrance, Milk Exosomes(10ppm), Nicotinamide Mononucleotide(10ppm), Nicotinamide Adenine Dinucleotide(10ppm), Lecithin, Hydrogenated Lecithin, Ceramide NP, Acetyl Glutamine, Polyglyceryl-10 Laurate, Bacillus/Folic Acid Ferment Filtrate Extract, Anemarrhena Asphodeloides Root Extract, Sodium Hyaluronate, Caprylyl Glycol, Copper Tripeptide-1, Tocopherol, Ceramide AP, Ceramide EOP, Dipeptide-2(0.01ppm), Tripeptide-3(0.01ppm), Hexapeptide-9(0.01ppm), Palmitoyl Tripeptide-5(0.01ppm), Palmitoyl Pentapeptide-4(0.01ppm), sh-Oligopeptide-1(0.0002 ppm), sh-Oligopeptide-2(0.0002 ppm), sh-Polypeptide-1(0.0002 ppm), sh-Polypeptide-9(0.0002 ppm), sh-Polypeptide-11(0.0002 ppm)',
    ingredients: ['pdrn', 'milk-exosome', 'nmn', 'nad', 'panthenol'],
  },
  {
    slug: 'rx-matrix-sheet',
    sourceFile: 'rx-matrix-sheet_pouch.pdf',
    issues: ['Bao bì không có mục [효능/효과] và không ghi "기능성"; mục Công dụng để trống.'],
    sources: {
      ko: 'Túi RX Matrix Sheet (rx-matrix-sheet_pouch.pdf), mặt sau tiếng Hàn; hộp (rx-matrix-sheet_box.pdf) có cùng nội dung',
      en: 'Túi RX Matrix Sheet (rx-matrix-sheet_pouch.pdf), mặt sau tiếng Anh',
      front: 'Mặt trước túi/hộp: CENTELLA ASIATICA LEAF WATER 741940.5 ppm, PDRN, E.G.F, SODIUM HYALURONATE, ALLANTOIN',
    },
    shortDescription: {
      ko: '각종 식물 유래 추출물과 Sodium DNA를 담은 마스크 시트',
      en: 'A sheet mask with various plant-derived extracts and Sodium DNA.',
      vi: 'Mặt nạ giấy chứa nhiều chiết xuất có nguồn gốc thực vật và Sodium DNA.',
    },
    description: {
      ko: '닥터피넥스 알엑스 매트릭스 시트는 각종 식물 유래 추출물과 Sodium DNA, 피부 진정 및 피부 보습에 도움을 주는 성분이 함유되어 피부 본연의 촉촉하고 건강한 피부를 만드는데 도움을 주는 마스크 시트입니다.',
      en: 'Dr. PhynEX RX Matrix Sheet is a sheet mask containing various plant-derived extracts, Sodium DNA, and ingredients that help soothe and moisturize the skin, helping to keep the skin feeling naturally moisturized and healthy.',
      vi: 'Dr. PhynEX RX Matrix Sheet là mặt nạ giấy chứa nhiều chiết xuất có nguồn gốc thực vật, Sodium DNA cùng các thành phần hỗ trợ làm dịu và dưỡng ẩm, giúp làn da giữ vẻ ẩm mịn, khỏe mạnh tự nhiên.',
    },
    claims: [],
    howToUse: {
      ko: [
        '세안 후 화장수로 얼굴 및 목을 정돈한 후 들뜨는 부위가 없도록 부착시킵니다.',
        '15~20분 동안 부착하고 마스크를 떼어 낸 후 피부 위에 남은 액은 가볍게 두드리면서 흡수시켜 줍니다.',
        '1주일에 2~3회 사용하시면 촉촉하고 탄력있는 피부를 유지할 수 있습니다.',
      ],
      en: [
        'After washing, apply toner. Pull out mask sheet from package and unfold.',
        'Carefully fit mask over face.',
        'Remove mask sheet after 15-20 minutes. Gently pat any remaining formula into skin.',
        'Use 2-3 times a week for the best result. Do not reuse mask sheets.',
      ],
      vi: [
        'Sau khi rửa mặt, cân bằng da mặt và cổ bằng toner, rồi đắp mặt nạ sao cho không có chỗ bị phồng.',
        'Đắp trong 15–20 phút, gỡ mặt nạ và vỗ nhẹ phần tinh chất còn lại trên da để thẩm thấu.',
        'Dùng 2–3 lần mỗi tuần để duy trì làn da ẩm mịn, đàn hồi.',
      ],
    },
    cautions: {
      ko: [...cautionsKoA, '눈 주위를 피하여 사용할 것.'],
      en: cautionsEn,
      vi: [...cautionsVi, 'Tránh dùng quanh vùng mắt.'],
    },
    inci:
      'Centella Asiatica Leaf Water(741940.5ppm), Butylene Glycol, Glycerin, Water, Alcohol Denat., 1,2-Hexanediol, Caprylic/Capric Triglyceride, Cetyl Ethylhexanoate, Chlorphenesin, Sorbitan Sesquioleate, Ethylhexylglycerin, Xanthan Gum, Tromethamine, Simmondsia Chinensis (Jojoba) Seed Oil, Hydroxyethylcellulose, Sodium DNA(500ppm), Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Allantoin(500ppm), PEG-60 Hydrogenated Castor Oil, Disodium EDTA, Menthol, Beta-Glucan, Sodium Hyaluronate(100ppm), Tocopheryl Acetate, Centella Asiatica Leaf Extract, Sophora Japonica Fruit Extract, Aloe Barbadensis Leaf Extract, Trehalose, Disodium Phosphate, Polysorbate 60, Sodium Phosphate, sh-Oligopeptide-1(0.0002ppm)',
    ingredients: ['centella-asiatica-leaf-water', 'pdrn', 'egf', 'sodium-hyaluronate', 'allantoin'],
  },
  {
    slug: 'mx-01-forma',
    sourceFile: 'mx-01-forma_box.pdf',
    sources: {
      ko: 'Hộp MX-01 FORMA (mx-01-forma_box.pdf), mặt sau tiếng Hàn',
      en: 'Hộp MX-01 FORMA (mx-01-forma_box.pdf), hai mặt bên tiếng Anh',
      front: 'Mặt trên hộp: PDRN X MILK EXOSOME, 3GF REGENERATIVE SYSTEM, PEPTIDE COMPLEX, NMN+NAD+, ANTI-WRINKLE',
    },
    shortDescription: {
      ko: 'PDRN과 멀티 펩타이드가 함유된 집중 케어 앰플',
      en: 'A concentrated care ampoule with PDRN and a multi-peptide complex.',
      vi: 'Ampoule chăm sóc chuyên sâu chứa PDRN và phức hợp đa peptide.',
    },
    description: {
      ko: '닥터피넥스 엠엑스 01 포마는 연어에서 추출한 고함량 PDRN 성분과 멀티 펩타이드가 함유된 집중 케어 앰플로 NMN과 우유엑소좀의 풍부한 보습과 영양이 탄탄하고 생기있는 피부로 가꿔주는 주름개선 기능성 화장품입니다.',
      en: 'A concentrated care ampoule containing PDRN derived from salmon and a multi-peptide complex, formulated with NMN and Milk Exosome to provide moisturizing care and help maintain healthy-looking skin. This product is a functional cosmetic for wrinkle care.',
      vi: 'Dr. PhynEX MX-01 FORMA là ampoule chăm sóc chuyên sâu chứa PDRN hàm lượng cao chiết xuất từ cá hồi cùng phức hợp đa peptide; NMN và exosome sữa mang lại độ ẩm và dưỡng chất dồi dào, giúp chăm sóc làn da săn chắc, tràn đầy sức sống. Đây là mỹ phẩm chức năng cải thiện nếp nhăn.',
    },
    claims: [
      {
        text: {
          ko: '피부의 주름개선에 도움을 줍니다.',
          en: 'Helps improve the appearance of wrinkles.',
          vi: 'Hỗ trợ cải thiện nếp nhăn.',
        },
        source: 'mx-01-forma_box.pdf, mặt sau tiếng Hàn, mục [효능/효과]; hộp ghi "주름개선 기능성 화장품"',
        note: 'Công dụng của mỹ phẩm chức năng theo quy định Hàn Quốc. Cần đối chiếu với phiếu công bố tại Việt Nam.',
      },
    ],
    howToUse: {
      ko: ['아침과 저녁으로 토너로 피부 정돈 후 적당량을 덜어 얼굴에 가볍게 두드리듯 흡수시켜줍니다.', '본품 적당량을 취해 피부에 골고루 펴 바릅니다.'],
      en: [
        'Apply a proper amount on the entire face in the morning and evening dabbing at your face gently after using Toner and Serum or with a cotton pad in serum.',
      ],
      vi: [
        'Sáng và tối, sau khi cân bằng da bằng toner, lấy một lượng vừa đủ và vỗ nhẹ lên mặt để sản phẩm thẩm thấu.',
        'Lấy một lượng sản phẩm vừa đủ và thoa đều lên da.',
      ],
    },
    cautions: { ko: cautionsKoB, en: cautionsEn, vi: cautionsVi },
    inci:
      'Water, Butylene Glycol, Glycerin, Sodium DNA, Panthenol, Sorbitan Sesquioleate, 1,2-Hexanediol, Hydrogenated Lecithin, Chlorphenesin, PEG-60 Hydrogenated Castor Oil, Isopentyldiol, Carbomer, Ceramide NP, Allantoin, Arginine, Adenosine, Lecithin, Disodium EDTA, Propanediol, Lactic Acid, Hydroxypropyl Cyclodextrin, Caprylyl Glycol, Sodium Hyaluronate, Cetyl Hydroxyethylcellulose, Rutin, Centella Asiatica Leaf Extract, Polyglycerin-3, Glutathione, Dipotassium Phosphate, Sodium Lactate, Nicotinamide Mononucleotide, Nicotinamide Adenine Dinucleotide, Polysorbate 20, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Acetyl Hexapeptide-8, Sodium Surfactin, Xanthan Gum, Milk Exosomes, 3-O-Ethyl Ascorbic Acid, Polylactic Acid, Hydrogenated Polyisobutene, Phaseolus Lunatus (Green Bean) Seed Extract, sh-Oligopeptide-1, sh-Polypeptide-1, Haematococcus Pluvialis Extract, Resveratrol, Olea Europaea (Olive) Fruit Oil, Caprylic/Capric Triglyceride, Propylene Glycol, Polysorbate 80, Ubiquinone, Acetyl Glutamine, Polyglyceryl-10 Laurate, Tocopheryl Acetate, Bacillus/Folic Acid Ferment Filtrate Extract, Copper Tripeptide-1, Anemarrhena Asphodeloides Root Extract, Dipeptide-2, Tripeptide-3, Hexapeptide-9, Palmitoyl Tripeptide-5, Palmitoyl Pentapeptide-4, Tocopherol, sh-Oligopeptide-2, sh-Polypeptide-9, sh-Polypeptide-11',
    ingredients: ['pdrn', 'milk-exosome', 'nmn', 'nad'],
  },
  {
    slug: 'mx-02-luma',
    sourceFile: 'mx-02-luma_box.pdf',
    issues: [
      'MÂU THUẪN TRÊN BAO BÌ, chưa quyết định: hộp (mx-02-luma_box.pdf, mặt sau) và nhãn lọ (mx-02-luma_vial.pdf, mặt sau) ghi "미백 및 주름개선 이중 기능성 화장품" (chức năng kép), nhưng mục [효능/효과] trên hộp chỉ ghi "피부의 주름개선에 도움을 줍니다" (cải thiện nếp nhăn). Công dụng đang nạp đúng như in; chờ thương hiệu xác nhận.',
    ],
    sources: {
      ko: 'Hộp MX-02 LUMA (mx-02-luma_box.pdf), mặt sau tiếng Hàn',
      en: 'Hộp MX-02 LUMA (mx-02-luma_box.pdf), hai mặt bên tiếng Anh',
      front: 'Mặt trên hộp: PDRN X MILK EXOSOME, 17 AMINO ACID COMPLEX, VITAMIN COMPLEX, SKIN BRIGHTENING, ANTI-WRINKLE',
    },
    shortDescription: {
      ko: 'Sodium DNA와 엑소좀, 17종 아미노산, 비타민 컴플렉스를 담은 미백 및 주름개선 이중 기능성 포뮬러',
      en: 'A dual-functional formula with Sodium DNA, Milk Exosome, 17 amino acids and a vitamin complex.',
      vi: 'Công thức chức năng kép chứa Sodium DNA, exosome sữa, 17 loại axit amin và phức hợp vitamin.',
    },
    description: {
      ko: '미백 및 주름개선 이중 기능성 포뮬러의 닥터피넥스 엠엑스 02 루마는 Sodium DNA와 엑소좀 성분 함유를 바탕으로 17종 아미노산, 비타민 컴플렉스가 촉촉하고 생기있는 본연의 건강한 피부로 가꾸는데 도움을 줍니다.',
      en: 'Dr. PhynEX MX-02 Luma is a dual-functional formula for skin brightening and anti-wrinkle care, formulated with Sodium DNA and Milk Exosome, complemented by a harmonious blend of 17 Amino Acids and a Vitamin Complex to help maintain healthy-looking, radiant skin.',
      vi: 'Với công thức chức năng kép làm sáng da và cải thiện nếp nhăn, Dr. PhynEX MX-02 LUMA chứa Sodium DNA và exosome, kết hợp 17 loại axit amin và phức hợp vitamin, giúp chăm sóc làn da ẩm mịn, tươi tắn và khỏe mạnh tự nhiên.',
    },
    claims: [
      {
        text: {
          ko: '피부의 주름개선에 도움을 줍니다.',
          en: 'Helps improve the appearance of wrinkles.',
          vi: 'Hỗ trợ cải thiện nếp nhăn.',
        },
        source: 'mx-02-luma_box.pdf, mặt sau tiếng Hàn, mục [효능/효과]',
        note: 'Chép đúng như in trên hộp. Xem ghi chú biên tập của sản phẩm.',
      },
    ],
    howToUse: {
      ko: ['아침과 저녁으로 토너로 피부 정돈 후 적당량을 덜어 얼굴에 가볍게 두드리듯 흡수시켜줍니다.', '본품 적당량을 취해 피부에 골고루 펴 바릅니다.'],
      en: [
        'Apply a proper amount on the entire face in the morning and evening dabbing at your face gently after using Toner and Serum or with a cotton pad in serum.',
      ],
      vi: [
        'Sáng và tối, sau khi cân bằng da bằng toner, lấy một lượng vừa đủ và vỗ nhẹ lên mặt để sản phẩm thẩm thấu.',
        'Lấy một lượng sản phẩm vừa đủ và thoa đều lên da.',
      ],
    },
    cautions: { ko: cautionsKoB, en: cautionsEn, vi: cautionsVi },
    inci:
      'Water, Butylene Glycol, Propanediol, Niacinamide, Sodium Chloride, 1,2-Hexanediol, Sodium DNA, Betaine, Panthenol, Sodium Hyaluronate, Allantoin, Adenosine, Hydroxyethylcellulose, Glycine, Serine, Glutamic Acid, Aspartic Acid, Leucine, Alanine, Lysine, Arginine, Tyrosine, Phenylalanine, Threonine, Proline, Valine, Isoleucine, Histidine, Methionine, Cysteine, Disodium Phosphate, Polysorbate 60, Nicotinamide Mononucleotide, Nicotinamide Adenine Dinucleotide, Cyanocobalamin, Biotin, Thiamine HCl, Riboflavin, Pyridoxine, Folic Acid, Acetyl Hexapeptide-8, Sodium Phosphate, Retinol, Menadione, Bioflavonoids, Xanthan Gum, Milk Exosomes, Coccinia Indica Fruit Extract, Opuntia Coccinellifera Fruit Extract',
    ingredients: ['pdrn', 'milk-exosome'],
  },
]
