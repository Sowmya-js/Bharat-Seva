import { IssueReport } from '../types';

export interface ImageTemplate {
  id: string;
  category: string;
  label: string;
  urlBefore: string;
  urlAfter: string;
}

export const SAMPLE_IMAGE_TEMPLATES: ImageTemplate[] = [
  {
    id: 'tpl_pothole',
    category: 'Potholes',
    label: 'Road Pothole (Andheri, Mumbai)',
    urlBefore: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
    urlAfter: 'https://images.unsplash.com/photo-1599740831618-f0782729b141?auto=format&fit=crop&q=80&w=600' // fresh black asphalt road
  },
  {
    id: 'tpl_water',
    category: 'Water Leakages',
    label: 'Water Pipe Leakage (Indiranagar, Bangalore)',
    urlBefore: 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&q=80&w=600',
    urlAfter: 'https://images.unsplash.com/photo-1617155093730-a8bf47be792d?auto=format&fit=crop&q=80&w=600' // dry neatly paved floor / clean pipeline
  },
  {
    id: 'tpl_lights',
    category: 'Damaged Streetlights',
    label: 'Dark Unlit Street (Dwarka, Delhi)',
    urlBefore: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8?auto=format&fit=crop&q=80&w=600',
    urlAfter: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=600' // beautifully lit highway
  },
  {
    id: 'tpl_waste',
    category: 'Waste Management',
    label: 'Overflowing Trash Pile (Salt Lake, Kolkata)',
    urlBefore: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600',
    urlAfter: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=600' // sparkling clean road
  },
  {
    id: 'tpl_infrastructure',
    category: 'Public Infrastructure',
    label: 'Broken Skywalk Guard Rail (Secunderabad)',
    urlBefore: 'https://images.unsplash.com/photo-1584467541268-b040f83be3fd?auto=format&fit=crop&q=80&w=600',
    urlAfter: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600' // secure steel structures / engineering worker
  }
];

// List of Indian states and some major districts
export const INDIAN_REGIONS = [
  {
    state: 'Andhra Pradesh',
    districts: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Nellore'],
    communities: ['MVP Colony Sector 1', 'Benz Circle Ward 4', 'Guntur City Center', 'Tirupati Temple Road', 'Nellore Town Area']
  },
  {
    state: 'Arunachal Pradesh',
    districts: ['Papum Pare', 'East Siang', 'Tawang', 'West Kameng'],
    communities: ['Itanagar Sector C', 'Pasighat Ward 3', 'Tawang Monastery Road', 'Bomdila Town']
  },
  {
    state: 'Assam',
    districts: ['Kamrup Metropolitan', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'],
    communities: ['Guwahati Paltan Bazaar', 'Dibrugarh Town Ward 2', 'Silchar Club Road', 'Jorhat Bypass Ward', 'Tezpur Center']
  },
  {
    state: 'Bihar',
    districts: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga'],
    communities: ['Patna Fraser Road', 'Gaya Bodhgaya Road', 'Muzaffarpur Club Road', 'Bhagalpur Town Ward 5', 'Darbhanga Fort Area']
  },
  {
    state: 'Chhattisgarh',
    districts: ['Raipur', 'Bilaspur', 'Durg', 'Bhilai', 'Korba'],
    communities: ['Raipur Shankar Nagar', 'Bilaspur Vyapar Vihar', 'Durg Station Ward', 'Bhilai Sector 6', 'Korba NTPC Area']
  },
  {
    state: 'Goa',
    districts: ['North Goa', 'South Goa'],
    communities: ['Panaji Miramar Beach', 'Margao Municipal Area', 'Calangute Ward 2', 'Vasco da Gama Sector A']
  },
  {
    state: 'Gujarat',
    districts: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
    communities: ['Ahmedabad Satellite', 'Surat Ring Road Ward', 'Vadodara Alkapuri', 'Rajkot Kalawad Road', 'Gandhinagar Sector 21']
  },
  {
    state: 'Haryana',
    districts: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Panchkula'],
    communities: ['Gurugram Sector 29', 'Faridabad NIT Block', 'Panipat GT Road Ward', 'Ambala Cantt Area', 'Panchkula Sector 5']
  },
  {
    state: 'Himachal Pradesh',
    districts: ['Shimla', 'Kangra', 'Mandi', 'Solan', 'Kullu'],
    communities: ['Shimla Mall Road', 'Dharamshala McLeodGanj', 'Mandi Town Ward 3', 'Solan Bypass Sector', 'Kullu Valley Ward']
  },
  {
    state: 'Jharkhand',
    districts: ['Ranchi', 'East Singhbhum', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
    communities: ['Ranchi Lalpur Area', 'Jamshedpur Bistupur', 'Dhanbad Station Road', 'Bokaro Sector 4', 'Hazaribagh Town']
  },
  {
    state: 'Karnataka',
    districts: ['Bengaluru Urban', 'Mysuru', 'Hubli-Dharwad', 'Mangaluru', 'Belagavi'],
    communities: ['Indiranagar Ward 80', 'Koramangala Block 3', 'Jayanagar 4th T Block', 'Whitefield Zone A', 'Malleshwaram 18th Cross']
  },
  {
    state: 'Kerala',
    districts: ['Thiruvananthapuram', 'Ernakulam', 'Kozhikode', 'Thrissur', 'Kollam'],
    communities: ['Thiruvananthapuram Kowdiar', 'Kochi MG Road Sector', 'Kozhikode Beach Road', 'Thrissur Round Ward 1', 'Kollam Town']
  },
  {
    state: 'Madhya Pradesh',
    districts: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain'],
    communities: ['Indore Vijay Nagar', 'Bhopal MP Nagar', 'Jabalpur Civil Lines', 'Gwalior Fort Area', 'Ujjain Mahakal Ward']
  },
  {
    state: 'Maharashtra',
    districts: ['Mumbai Suburbs', 'Pune', 'Nagpur', 'Thane', 'Nashik'],
    communities: ['Andheri West Ward A', 'Bandra Reclamation Sector 2', 'Kothrud Area D', 'Shivajinagar Block B', 'Thane West Central']
  },
  {
    state: 'Manipur',
    districts: ['Imphal West', 'Imphal East', 'Thoubal', 'Churachandpur'],
    communities: ['Imphal Kangla Road', 'Thoubal Bazar Ward', 'Churachandpur Center']
  },
  {
    state: 'Meghalaya',
    districts: ['East Khasi Hills', 'West Garo Hills', 'Ri-Bhoi'],
    communities: ['Shillong Police Bazar', 'Tura Town Sector 2', 'Nongpoh Ward 1']
  },
  {
    state: 'Mizoram',
    districts: ['Aizawl', 'Lunglei', 'Champhai'],
    communities: ['Aizawl Chanmari Ward', 'Lunglei Bazar Sector', 'Champhai Border Area']
  },
  {
    state: 'Nagaland',
    districts: ['Dimapur', 'Kohima', 'Mokokchung'],
    communities: ['Dimapur Church Road', 'Kohima Town Ward 5', 'Mokokchung Center']
  },
  {
    state: 'Odisha',
    districts: ['Khurda', 'Cuttack', 'Ganjam', 'Sambalpur', 'Rourkela'],
    communities: ['Bhubaneswar Patia Ward', 'Cuttack Link Road Area', 'Berhampur Town Sector', 'Sambalpur City Area', 'Rourkela Steel Township']
  },
  {
    state: 'Punjab',
    districts: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda'],
    communities: ['Amritsar Golden Temple Road', 'Ludhiana Sarabha Nagar', 'Jalandhar Model Town', 'Patiala Leela Bhawan', 'Bathinda Cantt']
  },
  {
    state: 'Rajasthan',
    districts: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
    communities: ['Jaipur C-Scheme', 'Jodhpur Sardarpura', 'Udaipur Lake Palace Area', 'Kota Talwandi Ward', 'Ajmer Vaishali Nagar']
  },
  {
    state: 'Sikkim',
    districts: ['Gangtok', 'Namchi', 'Gyalshing'],
    communities: ['Gangtok MG Marg', 'Namchi Town Sector', 'Gyalshing Center']
  },
  {
    state: 'Tamil Nadu',
    districts: ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem'],
    communities: ['Adyar Ward 12', 'T-Nagar Commercial Hub', 'Peelamedu Area B', 'Anna Nagar East', 'Kallipatti Ward 1']
  },
  {
    state: 'Telangana',
    districts: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
    communities: ['Gachibowli Tech Park', 'Warangal Fort Area', 'Nizamabad Town Ward', 'Karimnagar Market Block', 'Khammam Center']
  },
  {
    state: 'Tripura',
    districts: ['West Tripura', 'South Tripura', 'Unakoti'],
    communities: ['Agartala Palace Road', 'Belonia Town Ward', 'Kailasahar Center']
  },
  {
    state: 'Uttar Pradesh',
    districts: ['Lucknow', 'Kanpur', 'Gautam Buddha Nagar', 'Varanasi', 'Agra'],
    communities: ['Lucknow Hazratganj', 'Kanpur Swaroop Nagar', 'Noida Sector 62 Block', 'Varanasi Assi Ghat Ward', 'Agra Taj Ganj Sector']
  },
  {
    state: 'Uttarakhand',
    districts: ['Dehradun', 'Haridwar', 'Nainital', 'Udham Singh Nagar'],
    communities: ['Dehradun Rajpur Road', 'Haridwar Har Ki Pauri', 'Nainital Mall Road', 'Rudrapur City Center']
  },
  {
    state: 'West Bengal',
    districts: ['North 24 Parganas', 'Kolkata', 'Howrah', 'Darjeeling', 'Hooghly'],
    communities: ['Salt Lake Sector V', 'Gariahat South Ward', 'Howrah Station Zone', 'Mall Road Darjeeling', 'Chinsurah Ward 3']
  },
  {
    state: 'Andaman and Nicobar Islands',
    districts: ['South Andaman', 'North and Middle Andaman'],
    communities: ['Port Blair Marina Ward', 'Havelock Island Center']
  },
  {
    state: 'Chandigarh',
    districts: ['Chandigarh'],
    communities: ['Chandigarh Sector 17', 'Chandigarh Sector 35']
  },
  {
    state: 'Dadra and Nagar Haveli and Daman and Diu',
    districts: ['Daman', 'Diu', 'Dadra'],
    communities: ['Daman Devka Beach Road', 'Diu Fort Area', 'Silvassa Town Sector']
  },
  {
    state: 'Delhi',
    districts: ['South West Delhi', 'New Delhi', 'North West Delhi', 'Central Delhi', 'East Delhi'],
    communities: ['Dwarka Sector 6', 'Connaught Place Ward 1', 'Rohini Sector 15', 'Karol Bagh Block A', 'Mayur Vihar Phase 1']
  },
  {
    state: 'Jammu and Kashmir',
    districts: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla'],
    communities: ['Srinagar Dal Lake Ward', 'Jammu Gandhi Nagar Block', 'Anantnag Town', 'Baramulla Sector A']
  },
  {
    state: 'Ladakh',
    districts: ['Leh', 'Kargil'],
    communities: ['Leh Main Bazar', 'Kargil Town Center']
  },
  {
    state: 'Lakshadweep',
    districts: ['Lakshadweep'],
    communities: ['Kavaratti Main Ward', 'Minicoy Island Sector']
  },
  {
    state: 'Puducherry',
    districts: ['Puducherry', 'Karaikal', 'Mahe'],
    communities: ['Puducherry White Town', 'Karaikal Beach Ward', 'Mahe Center']
  }
];

export const CITIZEN_BADGES = [
  { id: 'b1', name: 'Satyameva Jayate', icon: '🇮🇳', desc: 'Registered on Bharat Seva' },
  { id: 'b2', name: 'Swachh Sentinel', icon: '🧹', desc: 'Reported first solid waste issue' },
  { id: 'b3', name: 'Water Warrior', icon: '💧', desc: 'Validated or reported water leakage' },
  { id: 'b4', name: 'Pavement Patrol', icon: '🛣️', desc: 'Logged a high-priority pothole' },
  { id: 'b5', name: 'Glow Guardian', icon: '💡', desc: 'Helped illuminate 3 dark streets' },
  { id: 'b6', name: 'Rashtra Sevak', icon: '🎖️', desc: 'Earned 300+ Swachh Bharat points' }
];

export const TECHNICIAN_BADGES = [
  { id: 't1', name: 'Karma Yogi', icon: '🛠️', desc: 'Logged in as a certified tech' },
  { id: 't2', name: 'Speed Demon', icon: '⚡', desc: 'Resolved a ticket in under 24 hours' },
  { id: 't3', name: 'AI Validated Master', icon: '🤖', desc: 'Got a 100% green light from AI validator' },
  { id: 't4', name: 'Community Savior', icon: '🏆', desc: 'Completed 10 community assignments' }
];

export function getProperCommunity(issue: IssueReport): string {
  if (issue.community) return issue.community;
  
  const loc = (issue.locationName || '').toLowerCase();
  
  // Scan all INDIAN_REGIONS for a matching community
  for (const region of INDIAN_REGIONS) {
    for (const comm of region.communities) {
      const shortComm = comm.replace(/\s*(Ward|Sector|Zone|Area|Block|Colony|Town|Center).*/i, '').trim().toLowerCase();
      if (shortComm && loc.includes(shortComm)) {
        return comm;
      }
    }
  }
  
  return issue.locationName ? issue.locationName.split(',')[0] : 'Unknown Ward';
}
