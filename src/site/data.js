// The catalogue the website is built from: categories, the vehicle types IVHM has templates for
// (ivhm/configs/aircraft_types/*.yaml), and what IVHM watches on each kind of part.
import MEDIA from '../data/media.json';

export const CATEGORIES = [
  { id: 'helicopters', name: 'Helicopters', short: 'Helicopters', blurb: 'Gearboxes, rotors and turboshafts that never rest, watched every flight hour.', looks: ['helicopter'] },
  { id: 'fighters', name: 'Fighter jets', short: 'Fighters', blurb: 'Single- and twin-engine fast jets, judged before every sortie.', looks: ['fighter_single_engine', 'fighter_twin_engine'] },
  { id: 'uav', name: 'UAVs', short: 'UAVs', blurb: 'Medium-altitude long-endurance unmanned aircraft, flying missions measured in days.', looks: ['male_uav'] },
  { id: 'drones', name: 'Drones', short: 'Drones', blurb: 'Industrial multirotors for inspection, survey and heavy lift.', looks: ['quadcopter', 'hexacopter'] },
];

export const VEHICLES = {
  quadcopter: { name: 'Quadcopter', cat: 'drones', tag: 'Four motors. Zero surprises on the job.', examples: 'DJI Matrice 300 · Skydio X10 · inspection and survey quads',
    text: 'Every motor, speed controller and propeller gets its own live twin. IVHM learns how this drone flies when healthy and spots a worn bearing or a chipped prop within a flight.', unit: 'flights' },
  hexacopter: { name: 'Hexacopter', cat: 'drones', tag: 'Six rotors, twice the redundancy, all of it watched.', examples: 'DJI Matrice · heavy-lift and spraying drones',
    text: 'Heavy-lift multirotors carry expensive payloads. IVHM tracks both battery packs and all six drive chains so you know which arm will let you down first.', unit: 'flights' },
  male_uav: { name: 'MALE UAV', cat: 'uav', tag: 'Twenty hours aloft. One answer before take-off.', examples: 'MQ-9 Reaper · DRDO TAPAS · Heron class',
    text: 'Medium-altitude long-endurance UAVs fly missions measured in days. Engine, propeller, control actuators and avionics are judged after every sortie.', unit: 'sorties' },
  fighter_single_engine: { name: 'Fighter (single engine)', cat: 'fighters', tag: 'One engine. No margin for guessing.', examples: 'HAL Tejas · F-16 · Gripen',
    text: 'With one engine there is no second chance. Engine, hydraulics, five flight-control actuators, gear, fuel, ECS, power and avionics are judged before every sortie.', unit: 'sorties' },
  fighter_twin_engine: { name: 'Fighter (twin engine)', cat: 'fighters', tag: 'Twin engines, twin hydraulics, one verdict.', examples: 'Dassault Rafale · Su-30MKI · F-15',
    text: 'Twin-engine fast jets add an APU and more actuators. IVHM compares the two engines against each other as well as against their own learned normal.', unit: 'sorties' },
  helicopter: { name: 'Helicopter', cat: 'helicopters', tag: 'Gearboxes, rotors and shafts that never rest.', examples: 'HAL Dhruv · Airbus H125 · Black Hawk',
    text: 'Main and tail gearboxes, the drive shaft and its bearings, both rotors with track-and-balance, two turboshafts. The parts that keep a helicopter in the air are all on the board.', unit: 'flight hours' },
};
// clips that do not show the vehicle well (wildfire seen from a drone; a far-off speck): show the photo instead
const PHOTO_ONLY = ['hexacopter', 'fighter_single_engine', 'quadcopter'];
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
export function partInfo(id) {
  const hit = PARTS.find(([p]) => id === p || id.startsWith(p + '_'));
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
const ENGINE_BY_LOOK = { airliner_narrowbody: 'turbofan', fighter_single_engine: 'turbofan', fighter_twin_engine: 'turbofan',
  turboprop_transport: 'turboprop', male_uav: 'piston', helicopter: 'turboshaft' };
/** the photo key for a part of a given vehicle type (null when there is no good photo of that kind of part) */
export function photoKey(look, id) {
  const is = (p) => id === p || id.startsWith(p + '_');
  if (is('engine')) return ENGINE_BY_LOOK[look] || 'turbofan';
  if (is('motor')) return 'motor';
  if (is('esc') || is('inverter')) return 'esc';
  if (is('propeller')) return ['turboprop_transport', 'male_uav'].includes(look) ? 'aprop' : 'propeller';
  if (is('rotor')) return look === 'evtol' ? 'propeller' : 'rotor';
  if (is('main_rotor') || is('tail_rotor')) return 'rotor';
  if (is('battery')) return 'battery';
  if (is('avionics') || is('guidance') || is('storage_logger')) return 'avionics';
  if (is('seeker')) return 'missile';
  if (is('landing_gear')) return 'gear';
  if (is('flight_actuator')) return 'aileron';
  if (is('actuator') || is('control_fin')) return 'actuator';
  if (id.includes('gearbox')) return 'gearbox';
  if (is('drivetrain')) return look === 'helicopter' ? 'shaft' : 'gearbox';
  if (id.includes('bearing')) return 'bearing';
  if (is('airframe') || is('structure') || is('wing_panel')) return 'airframe';
  if (is('liquid_engine') || is('nozzle')) return 'rocket_engine';
  if (is('solid_booster') || is('rocket_motor')) return 'srb';
  if (is('solar_power')) return 'solar';
  if (is('reaction_wheel')) return 'reaction_wheel';
  if (is('thruster')) return 'thruster';
  if (is('thermal')) return 'mli';
  if (is('apu')) return 'apu';
  if (is('compressor')) return 'compressor';
  if (is('turbine')) return 'turbine';
  if (is('combustor')) return 'combustor';
  return null;
}
export const partPhoto = (look, id) => COMPONENT_PHOTOS[photoKey(look, id)] || null;
