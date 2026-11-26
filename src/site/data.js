// The catalogue the website is built from: categories, the vehicle types IVHM has templates for
// (ivhm/configs/aircraft_types/*.yaml), and what IVHM watches on each kind of part.
import MEDIA from '../data/media.json';

export const CATEGORIES = [
  { id: 'helicopters', name: 'Helicopters', short: 'Helicopters', blurb: 'Gearboxes, rotors and turboshafts that never rest, watched every flight hour.', looks: ['helicopter'] },
  { id: 'fighters', name: 'Fighter jets', short: 'Fighters', blurb: 'Single- and twin-engine fast jets, judged before every sortie.', looks: ['fighter_single_engine', 'fighter_twin_engine'] },
  { id: 'uav', name: 'UAVs', short: 'UAVs', blurb: 'Medium-altitude long-endurance unmanned aircraft, flying missions measured in days.', looks: ['male_uav'] },
  { id: 'drones', name: 'Drones', short: 'Drones', blurb: 'Industrial multirotors for inspection, survey and heavy lift.', looks: ['quadcopter', 'hexacopter'] },
  { id: 'airliners', name: 'Airliners', short: 'Airliners', blurb: 'Narrow-body jets flying many cycles a day, where every engine cycle counts.', looks: ['airliner_narrowbody'] },
];

export const VEHICLES = {
  quadcopter: { name: 'Quadcopter', cat: 'drones', tag: 'Four motors. Zero surprises on the job.', examples: 'DJI Matrice 300 · Skydio X10 · inspection and survey quads',
    text: 'Every motor, speed controller and propeller gets its own live twin. IVHM learns how this drone flies when healthy and spots a worn bearing or a chipped prop within a flight.', unit: 'flights' },
  hexacopter: { name: 'Hexacopter', cat: 'drones', tag: 'Six rotors, twice the redundancy, all of it watched.', examples: 'DJI Matrice · heavy-lift and spraying drones',
    text: 'Heavy-lift multirotors carry expensive payloads. IVHM tracks both battery packs and all six drive chains so you know which arm will let you down first.', unit: 'flights' },
  male_uav: { name: 'MALE UAV', cat: 'uav', tag: 'Twenty hours aloft. One answer before take-off.', examples: 'DRDO Rustom-2 (TAPAS-BH-201) · IAI Heron Mk I · Heron Mk II · Indian Army and IAF',
    text: 'Medium-altitude long-endurance UAVs fly missions measured in days. Engine, propeller, control actuators and avionics are judged after every sortie.', unit: 'sorties' },
  fighter_single_engine: { name: 'Fighter (single engine)', cat: 'fighters', tag: 'One engine. No margin for guessing.', examples: 'HAL Tejas Mk1 · Tejas Mk1A',
    text: 'With one engine there is no second chance. Engine, hydraulics, five flight-control actuators, gear, fuel, ECS, power and avionics are judged before every sortie.', unit: 'sorties' },
  fighter_twin_engine: { name: 'Fighter (twin engine)', cat: 'fighters', tag: 'Twin engines, twin hydraulics, one verdict.', examples: 'Sukhoi Su-30MKI · Indian Air Force',
    text: 'Twin-engine fast jets add an APU and more actuators. IVHM compares the two engines against each other as well as against their own learned normal.', unit: 'sorties' },
  airliner_narrowbody: { name: 'Narrow-body airliner', cat: 'airliners', tag: 'Two engines, six cycles a day, every one accounted for.', examples: 'Airbus A320 family · Air India · IndiGo · Air India Express',
    text: 'A320-class twin-jets with CFM56 turbofans. IVHM tracks both engines cycle by cycle against NASA run-to-failure data, along with the gear, APU, flight controls, wing structure, hydraulics, fuel and air conditioning.', unit: 'cycles' },
  helicopter: { name: 'Helicopter', cat: 'helicopters', tag: 'Gearboxes, rotors and shafts that never rest.', examples: 'HAL Dhruv (Indian Army) · HAL Dhruv (IAF) · Sarang display team',
    text: 'Main and tail gearboxes, the drive shaft and its bearings, both rotors with track-and-balance, two turboshafts. The parts that keep a helicopter in the air are all on the board.', unit: 'flight hours' },
};
// clips that do not show the vehicle well (wildfire seen from a drone; a far-off speck): show the photo instead
const PHOTO_ONLY = ['hexacopter', 'fighter_single_engine', 'quadcopter', 'airliner_narrowbody'];
for (const [look, v] of Object.entries(VEHICLES)) {
  v.look = look;
  v.media = { ...(MEDIA[look] || {}) };
  if (PHOTO_ONLY.includes(look)) delete v.media.video;
  v.photo = v.media.photo?.thumb;
  v.video = v.media.video?.src;
}
export const LOOKS = Object.keys(VEHICLES);
export const catOf = (look) => CATEGORIES.find((c) => c.looks.includes(look));

// what IVHM watches on each kind of part, by component id prefix
const P = (label, pack, sensors, watches, unit) => ({ label, pack, sensors, watches, unit });
const PARTS = [
  ['motor', P('Electric motor', 'Electric motor (BLDC/PMSM)', ['voltage', 'current', 'speed', 'winding_temp', 'vibration'], 'Bearing friction, winding resistance and magnet strength, each against the motor when new.')],
  ['esc', P('Speed controller', 'Motor controller (ESC / inverter)', ['bus_voltage', 'phase_current', 'board_temp', 'switch_temp'], 'Thermal resistance rise of the power switches and life used from temperature cycles.')],
  ['inverter', P('Inverter', 'Motor controller (ESC / inverter)', ['bus_voltage', 'phase_current', 'board_temp', 'switch_temp'], 'Thermal resistance rise of the power switches and life used from temperature cycles.')],
  ['propeller', P('Propeller', 'Propeller / rotor', ['vibration_1p', 'vibration_2p', 'speed'], 'Imbalance and blade damage from the once-per-rev vibration.')],
  ['main_rotor', P('Main rotor', 'Propeller / rotor', ['track', 'vibration_1r', 'vibration_nr', 'speed'], 'Track and balance, blade damage and hub wear.')],
  ['tail_rotor', P('Tail rotor', 'Propeller / rotor', ['vibration_1r', 'speed', 'pitch_link_load'], 'Imbalance and pitch-link wear.')],
  ['rotor', P('Rotor', 'Propeller / rotor', ['vibration_1p', 'speed', 'pitch'], 'Imbalance, blade erosion and pitch-system wear.')],
  ['battery', P('Battery', 'Battery (Li-ion / LiPo)', ['voltage', 'current', 'temperature', 'resting_voltage'], 'Capacity fade and internal resistance from every charge and discharge.')],
  ['avionics', P('Avionics', 'Avionics LRUs', ['board_temp', 'supply_voltage', 'bit_faults', 'resets'], 'Built-in-test faults, thermal stress and resets, unit by unit.')],
  ['liquid_engine', P('Liquid engine', 'Liquid rocket engine', ['chamber_pressure', 'turbopump_speed', 'injector_dp', 'nozzle_temp'], 'Turbopump wear and injector clogging from hot-fire data.')],
  ['engine', P('Engine', 'Gas turbine / piston engine', ['egt', 'n1', 'n2', 'fuel_flow', 'oil_pressure', 'vibration'], 'Compressor and turbine wear from the gas path, learned normal per engine.')],
  ['apu', P('APU', 'Auxiliary power unit', ['egt', 'speed', 'start_time', 'oil_temp'], 'Start time and EGT margin, the two early signs of a tired APU.')],
  ['reduction_gearbox', P('Reduction gearbox', 'Gearbox', ['vibration', 'oil_temp', 'chip_detector'], 'Gear vibration that changed and stayed changed; chips in the oil.')],
  ['main_gearbox', P('Main gearbox', 'Gearbox', ['vibration', 'oil_temp', 'oil_pressure', 'chip_detector'], 'Gear and bearing damage from vibration, oil debris and temperature.')],
  ['tail_gearbox', P('Tail gearbox', 'Gearbox', ['vibration', 'oil_temp', 'chip_detector'], 'Gear vibration and chip detections.')],
  ['gearbox', P('Gearbox', 'Gearbox', ['vibration', 'oil_temp', 'chip_detector'], 'Gear vibration that changed and stayed changed.')],
  ['drivetrain', P('Drivetrain', 'Drivetrain', ['vibration', 'torque', 'speed', 'oil_temp'], 'Shaft, coupling and gear health along the power path.')],
  ['drive_bearing', P('Drive shaft bearing', 'Rolling bearing', ['vibration_envelope', 'temperature'], 'Bearing defect frequencies in the vibration envelope.')],
  ['main_bearing', P('Main bearing', 'Rolling bearing', ['vibration_envelope', 'temperature', 'speed'], 'Bearing defect frequencies and temperature rise.')],
  ['bearing', P('Bearing', 'Rolling bearing', ['vibration_envelope', 'temperature'], 'Bearing defect frequencies in the vibration envelope.')],
  ['flight_actuator', P('Flight-control actuator', 'Actuator', ['command', 'position', 'current', 'rate'], 'How closely the surface follows its command, and how hard it works to do it.')],
  ['actuator', P('Actuator', 'Actuator', ['command', 'position', 'current', 'rate'], 'Tracking error and effort compared with when new.')],
  ['control_fin', P('Control fin actuator', 'Actuator', ['command', 'position', 'current'], 'Response checked in periodic built-in tests.')],
  ['landing_gear', P('Landing gear', 'Landing gear', ['retract_time', 'strut_pressure', 'brake_temp', 'tyre_pressure'], 'Retraction time, shock-strut servicing and brake heat-sink wear.')],
  ['hydraulics', P('Hydraulic system', 'Hydraulic system', ['pressure', 'flow', 'fluid_temp', 'pump_case_drain'], 'Pump leakage, valve condition, accumulator charge and cooler efficiency.')],
  ['fuel', P('Fuel system', 'Fuel system', ['pump_pressure', 'flow', 'filter_dp', 'quantity'], 'Boost-pump health, filter clogging and gauging errors.')],
  ['ecs', P('Air conditioning (ECS)', 'Environmental control', ['pack_outlet_temp', 'bleed_pressure', 'fan_speed'], 'Heat-exchanger fouling and air-cycle machine wear.')],
  ['electrical', P('Electrical power', 'Electrical power', ['bus_voltage', 'generator_current', 'gen_temp'], 'Generator and converter health, bus quality.')],
  ['airframe', P('Airframe', 'Composite / metal structure', ['strain', 'load_cycles', 'impacts'], 'Fatigue damage from every load cycle, and impact events.')],
  ['structure', P('Structure', 'Structure fatigue', ['strain', 'load_cycles'], 'Fatigue damage from every load cycle.')],
  ['wing_panel', P('Wing panel', 'Structure fatigue', ['strain', 'load_cycles'], 'Crack length now and load cycles left, from the Virkler crack-growth population.')],
  ['solid_booster', P('Solid booster', 'Solid rocket motor', ['case_temp', 'storage_age', 'bondline_ultrasound'], 'Propellant ageing and bond-line condition.')],
  ['thermal', P('Thermal control', 'Thermal control', ['panel_temps', 'heater_duty', 'radiator_temp'], 'Heater duty and radiator degradation.')],
  ['solar_power', P('Solar arrays', 'Solar array', ['array_current', 'array_voltage', 'panel_temp'], 'Power fade from radiation and cell string failures.')],
  ['reaction_wheel', P('Reaction wheel', 'Reaction wheel', ['speed', 'motor_current', 'bearing_temp'], 'Bearing friction rising from the current needed to hold speed.')],
  ['thruster', P('Thruster', 'Thruster', ['chamber_pressure', 'valve_temp', 'pulses'], 'Catalyst bed and valve wear from pulse counts.')],
  ['canister', P('Storage canister', 'Munition storage', ['temperature', 'humidity', 'shock'], 'Seal condition, internal humidity and shock events.')],
  ['seeker', P('Seeker', 'Munition storage', ['temperature', 'bit_result'], 'Built-in-test results and thermal ageing of the electronics.')],
  ['warhead_section', P('Warhead section', 'Munition storage', ['temperature', 'temperature_cycles'], 'Equivalent age from heat (Arrhenius) and moisture (Peck).')],
  ['guidance', P('Guidance unit', 'Munition storage', ['temperature', 'bit_result'], 'Built-in-test results and electronics ageing.')],
  ['rocket_motor', P('Rocket motor', 'Munition storage', ['temperature', 'temperature_cycles', 'surveillance_tests'], 'Propellant stabiliser depletion, corrected by surveillance test results.')],
  ['nozzle', P('Nozzle', 'Munition storage', ['temperature', 'humidity'], 'Corrosion and seal ageing.')],
  ['storage_logger', P('Storage logger', 'Munition storage', ['temperature', 'humidity', 'shock'], 'The sensor that feeds everything else; its own health is checked too.')],
  ['compressor', P('Compressor', 'Gas turbine', ['p_ratio', 'inlet_temp', 'speed', 'vibration'], 'Fouling and blade erosion from the pressure ratio and efficiency.')],
  ['combustor', P('Combustor', 'Gas turbine', ['egt_spread', 'fuel_flow', 'flame_temp'], 'Nozzle clogging from the spread between exhaust probes.')],
  ['turbine', P('Turbine', 'Gas turbine', ['egt', 'speed', 'vibration'], 'Hot-section wear from EGT margin.')],
  ['oil_pump', P('Oil pump', 'Pump', ['outlet_pressure', 'flow', 'temperature'], 'Pressure and flow against speed, the signature of a wearing pump.')],
  ['fuel_pump', P('Fuel pump', 'Pump', ['outlet_pressure', 'flow', 'current'], 'Pressure and flow against speed.')],
  ['generator', P('Generator', 'Electrical power', ['voltage', 'current', 'winding_temp'], 'Winding temperature rise and output quality.')],
];
// helicopters of the Dhruv class land on skids: no wheels, tyres, brakes or retraction
const SKID = P('Skid landing gear', 'Skid landing gear', ['cross_tube_strain_fwd', 'cross_tube_strain_aft', 'landing_load'], 'Cross-tube strain from hard landings, skid-shoe wear and fitting condition.');
export function partInfo(id, look) {
  const hit = look === 'helicopter' && (id === 'landing_gear' || id.startsWith('landing_gear_')) ? ['landing_gear', SKID] : PARTS.find(([p]) => id === p || id.startsWith(p + '_'));
  const n = id.match(/_(\d+)$/)?.[1];
  const base = hit ? hit[1] : P(id.replace(/_/g, ' '), 'General data-only twin', ['sensor_1', 'sensor_2', 'sensor_3'], 'Learns its own normal from its own data.');
  return { ...base, name: base.label + (n ? ` ${n}` : '') };
}
export const prettyId = (id) => partInfo(id).name;

// systems the inspector groups parts into
const GROUPS = [
  ['Propulsion', ['engine', 'liquid_engine', 'solid_booster', 'rocket_motor', 'nozzle', 'apu', 'compressor', 'combustor', 'turbine', 'thruster', 'motor', 'esc', 'inverter', 'propeller', 'rotor', 'main_rotor', 'tail_rotor']],
  ['Drivetrain', ['reduction_gearbox', 'main_gearbox', 'tail_gearbox', 'gearbox', 'drivetrain', 'drive_bearing', 'main_bearing', 'bearing_front', 'bearing_rear', 'bearing']],
  ['Power', ['battery', 'electrical', 'solar_power', 'generator']],
  ['Flight control', ['flight_actuator', 'actuator', 'control_fin', 'reaction_wheel']],
  ['Systems', ['hydraulics', 'fuel', 'ecs', 'thermal', 'oil_pump', 'fuel_pump']],
  ['Avionics', ['avionics', 'guidance', 'seeker', 'storage_logger']],
  ['Structure', ['airframe', 'structure', 'wing_panel', 'canister', 'landing_gear', 'warhead_section']],
];
export const GROUP_ORDER = GROUPS.map(([g]) => g).concat('Other');
export function groupOf(id) {
  for (const [g, ps] of GROUPS) if (ps.some((p) => id === p || id.startsWith(p + '_'))) return g;
  return 'Other';
}

export const VERDICT = {
  SAFE: { word: 'Safe', color: 'var(--safe)' },
  GO: { word: 'Go', color: 'var(--safe)' },
  CAUTION: { word: 'Caution', color: 'var(--caution)' },
  'NO-GO': { word: 'No-go', color: 'var(--nogo)' },
  NO_GO: { word: 'No-go', color: 'var(--nogo)' },
  UNKNOWN: { word: 'Not judged yet', color: 'var(--dim)' },
};
export const verdictOf = (v) => VERDICT[v] || VERDICT.UNKNOWN;
export const healthColor = (h, v) => (v === 'NO-GO' || v === 'NO_GO' ? '#f87171' : v === 'CAUTION' ? '#fbbf24' : h == null ? '#94a3b8' : h < 0.35 ? '#f87171' : h < 0.6 ? '#fbbf24' : '#34d399');

// ---------- real photographs of each kind of component (Wikimedia Commons, credited) ----------
import COMPONENT_PHOTOS from '../data/components.json';
export { COMPONENT_PHOTOS };
// Which real photograph shows which part. Each photo was checked against the aircraft it appears on:
// the fighter engine is the GE F404 (Tejas), the helicopter engine the HAL/Turbomeca Shakti (Dhruv), the UAV
// engine a Rotax 914 piston engine (as on the IAI Heron). Helicopters land on skids, fighters and UAVs on wheels;
// drones get drone parts (outrunner motor, 4-in-1 ESC, LiPo pack, Pixhawk flight controller). No photo when none is accurate.
const ENGINE_BY_LOOK = { airliner_narrowbody: 'cfm56', fighter_single_engine: 'f404', fighter_twin_engine: 'f404', helicopter: 'shakti', male_uav: 'piston' };
const DRONES = ['quadcopter', 'hexacopter'];
/** the photo key for a part of a given vehicle type (null when there is no accurate photo of that part) */
export function photoKey(look, id) {
  const is = (p) => id === p || id.startsWith(p + '_');
  const drone = DRONES.includes(look);
  if (is('airframe')) return 'airframe';
  if (is('engine')) return ENGINE_BY_LOOK[look] || null;
  if (is('apu')) return look === 'airliner_narrowbody' ? 'airliner_apu' : 'apu';
  if (is('motor')) return 'motor';
  if (is('esc') || is('inverter')) return 'esc';
  if (is('battery')) return 'battery';
  if (is('propeller')) return drone ? 'propeller' : look === 'male_uav' ? 'uav_prop' : null;
  if (is('rotor')) return drone ? 'propeller' : null;
  if (is('main_rotor')) return 'rotor';
  if (is('tail_rotor')) return 'tail_rotor';
  if (is('main_gearbox')) return 'gearbox';
  if (is('tail_gearbox')) return 'tail_gearbox';
  if (is('landing_gear')) return look === 'helicopter' ? 'skid' : look === 'airliner_narrowbody' ? 'airliner_gear' : 'gear';
  if (is('avionics')) return drone ? 'fc' : look === 'airliner_narrowbody' ? null : 'avionics';
  if (is('flight_actuator') || is('actuator')) return 'actuator';
  if (id.includes('bearing')) return 'bearing';
  if (is('electrical')) return 'generator';
  if (is('ecs')) return 'ecs';
  return null;   // drivetrain, hydraulics, fuel: no accurate free photo found yet
}
export const partPhoto = (look, id) => { const k = photoKey(look, id); return k === 'airframe' ? VEHICLES[look]?.media?.photo || null : COMPONENT_PHOTOS[k] || null; };
