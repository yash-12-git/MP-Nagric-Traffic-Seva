// VAHAN vehicle-registry lookup.
//
// DEMO ONLY: returns hardcoded owner data for 20 known MP plates, and a generic
// fallback for anything else.
//
// TO REPLACE WITH REAL VAHAN API:
// 1. Set VAHAN_API_KEY in .env
// 2. Set VAHAN_API_URL in .env
// 3. Set VAHAN_MODE=live in .env
// 4. Replace lookupVahan() body with:
//    const res = await axios.get(`${process.env.VAHAN_API_URL}/rc/vehicledetails`, {
//      headers: { 'x-api-key': process.env.VAHAN_API_KEY },
//      params: { regNo: plateNumber }
//    });
//    return res.data;
// (Real service: https://vahan.parivahan.gov.in/api/ — post government agreement.)

const VAHAN_DB = {
  MP04AB1234: {
    owner_name: 'Suresh Kumar Patel',
    owner_address: '12, Shyamla Hills, Bhopal, MP 462013',
    vehicle_type: 'Motorcycle - Hero Splendor Plus',
    registration_date: '2019-03-15',
    fitness_valid_until: '2025-03-14',
    insurance_valid_until: '2024-12-31',
  },
  MP04CD5678: {
    owner_name: 'Meena Rajput',
    owner_address: '45, New Market, Bhopal, MP 462001',
    vehicle_type: 'Car - Maruti Swift Dzire',
    registration_date: '2021-07-22',
    fitness_valid_until: '2027-07-21',
    insurance_valid_until: '2025-07-21',
  },
  MP07GH9012: {
    owner_name: 'Imran Khan',
    owner_address: '8, Vijay Nagar, Indore, MP 452010',
    vehicle_type: 'Motorcycle - Bajaj Pulsar 150',
    registration_date: '2020-01-10',
    fitness_valid_until: '2026-01-09',
    insurance_valid_until: '2025-01-09',
  },
  MP04XY3456: {
    owner_name: 'Anjali Verma',
    owner_address: '23, Arera Colony, Bhopal, MP 462016',
    vehicle_type: 'Car - Hyundai i20',
    registration_date: '2018-11-05',
    fitness_valid_until: '2024-11-04',
    insurance_valid_until: '2024-10-30',
  },
  MP09KL7890: {
    owner_name: 'Rakesh Yadav',
    owner_address: '67, Rajwada, Indore, MP 452004',
    vehicle_type: 'Car - Tata Nexon',
    registration_date: '2022-05-18',
    fitness_valid_until: '2028-05-17',
    insurance_valid_until: '2025-05-17',
  },
  MP04EF2345: {
    owner_name: 'Pooja Sharma',
    owner_address: '5, Kohefiza, Bhopal, MP 462001',
    vehicle_type: 'Scooter - Honda Activa 6G',
    registration_date: '2021-02-14',
    fitness_valid_until: '2027-02-13',
    insurance_valid_until: '2025-02-13',
  },
  MP20MN6789: {
    owner_name: 'Vikram Singh Chouhan',
    owner_address: '14, Civil Lines, Jabalpur, MP 482001',
    vehicle_type: 'Car - Mahindra Scorpio',
    registration_date: '2019-09-30',
    fitness_valid_until: '2025-09-29',
    insurance_valid_until: '2024-12-15',
  },
  MP08PQ1122: {
    owner_name: 'Sunita Dubey',
    owner_address: '9, Napier Town, Jabalpur, MP 482002',
    vehicle_type: 'Motorcycle - TVS Apache RTR',
    registration_date: '2020-08-21',
    fitness_valid_until: '2026-08-20',
    insurance_valid_until: '2025-08-20',
  },
  MP13RS3344: {
    owner_name: 'Mohammed Arif',
    owner_address: '31, Itarsi Road, Hoshangabad, MP 461001',
    vehicle_type: 'Car - Maruti Wagon R',
    registration_date: '2017-06-12',
    fitness_valid_until: '2024-06-11',
    insurance_valid_until: '2024-09-01',
  },
  MP04TU5566: {
    owner_name: 'Deepak Malviya',
    owner_address: '50, MP Nagar, Bhopal, MP 462011',
    vehicle_type: 'Motorcycle - Royal Enfield Classic 350',
    registration_date: '2021-12-01',
    fitness_valid_until: '2027-11-30',
    insurance_valid_until: '2025-11-30',
  },
  MP09VW7788: {
    owner_name: 'Kavita Joshi',
    owner_address: '18, Sapna Sangeeta Road, Indore, MP 452001',
    vehicle_type: 'Car - Honda City',
    registration_date: '2022-03-25',
    fitness_valid_until: '2028-03-24',
    insurance_valid_until: '2025-03-24',
  },
  MP04AX9900: {
    owner_name: 'Gaurav Tiwari',
    owner_address: '7, Bairagarh, Bhopal, MP 462030',
    vehicle_type: 'Motorcycle - Hero Passion Pro',
    registration_date: '2019-04-19',
    fitness_valid_until: '2025-04-18',
    insurance_valid_until: '2024-11-19',
  },
  MP07YZ2233: {
    owner_name: 'Neha Agrawal',
    owner_address: '22, Palasia, Indore, MP 452001',
    vehicle_type: 'Car - Kia Seltos',
    registration_date: '2023-01-08',
    fitness_valid_until: '2029-01-07',
    insurance_valid_until: '2026-01-07',
  },
  MP04BC4455: {
    owner_name: 'Ramesh Lodhi',
    owner_address: '40, Govindpura, Bhopal, MP 462023',
    vehicle_type: 'Auto Rickshaw - Bajaj RE',
    registration_date: '2018-07-15',
    fitness_valid_until: '2024-07-14',
    insurance_valid_until: '2024-08-14',
  },
  MP08DE6677: {
    owner_name: 'Sapna Thakur',
    owner_address: '11, Wright Town, Jabalpur, MP 482002',
    vehicle_type: 'Scooter - Suzuki Access 125',
    registration_date: '2021-10-10',
    fitness_valid_until: '2027-10-09',
    insurance_valid_until: '2025-10-09',
  },
  MP04FG8899: {
    owner_name: 'Aditya Saxena',
    owner_address: '3, Char Imli, Bhopal, MP 462016',
    vehicle_type: 'Car - Toyota Innova Crysta',
    registration_date: '2020-12-22',
    fitness_valid_until: '2026-12-21',
    insurance_valid_until: '2025-12-21',
  },
  MP09HI1010: {
    owner_name: 'Farah Naaz',
    owner_address: '28, Bhawarkua, Indore, MP 452001',
    vehicle_type: 'Motorcycle - Yamaha FZ',
    registration_date: '2022-06-30',
    fitness_valid_until: '2028-06-29',
    insurance_valid_until: '2025-06-29',
  },
  MP04JK2020: {
    owner_name: 'Harish Chandra Nema',
    owner_address: '16, Ashoka Garden, Bhopal, MP 462023',
    vehicle_type: 'Car - Renault Kwid',
    registration_date: '2019-08-08',
    fitness_valid_until: '2025-08-07',
    insurance_valid_until: '2024-12-08',
  },
  MP20LM3030: {
    owner_name: 'Pradeep Kushwaha',
    owner_address: '52, Madan Mahal, Jabalpur, MP 482001',
    vehicle_type: 'Truck - Tata 407',
    registration_date: '2017-03-03',
    fitness_valid_until: '2024-03-02',
    insurance_valid_until: '2024-07-03',
  },
  MP04NO4040: {
    owner_name: 'Shweta Bhargava',
    owner_address: '19, Habibganj, Bhopal, MP 462024',
    vehicle_type: 'Car - Volkswagen Polo',
    registration_date: '2021-05-05',
    fitness_valid_until: '2027-05-04',
    insurance_valid_until: '2025-05-04',
  },
};

// Default for unknown plates.
const DEFAULT_RESPONSE = {
  owner_name: 'Owner details pending',
  owner_address: 'Address not available in registry',
  vehicle_type: 'Unknown',
  registration_date: null,
  note: 'VAHAN lookup required post government API access',
};

/**
 * Look up vehicle owner details by plate number.
 * @param {string} plateNumber
 * @returns {object} owner + vehicle details
 */
function lookupVahan(plateNumber) {
  if (!plateNumber) return { ...DEFAULT_RESPONSE };
  const key = plateNumber.toUpperCase().replace(/\s/g, '');
  const hit = VAHAN_DB[key];
  console.log(`[vahan] (mock) lookup ${key} -> ${hit ? hit.owner_name : 'NOT FOUND, default response'}`);
  return hit ? { ...hit } : { ...DEFAULT_RESPONSE };
}

module.exports = { lookupVahan, VAHAN_DB };
