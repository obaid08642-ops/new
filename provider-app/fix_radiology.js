const fs = require('fs');
const path = './src/screens/radiology/RadiologyRegistration.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace exports
code = code.replace(/export function LabRegistration\(\{ providerType, onBack, onDone \}: any\) \{/g, 'export function RadiologyRegistration({ onBack, onDone }: any) {');
// Remove conditional logic for Lab vs Radiology since this is strictly Radiology now
code = code.replace(/const isLab = providerType === 'lab';/g, 'const isLab = false;');
code = code.replace(/providerType/g, "'radiology'");
code = code.replace(/LabRegistration/g, 'RadiologyRegistration');
code = code.replace(/معمل التحاليل/g, 'مركز الأشعة');
code = code.replace(/المعمل/g, 'المركز');
code = code.replace(/Laboratory/g, 'Radiology');
code = code.replace(/Lab/g, 'Radiology');

fs.writeFileSync(path, code);
console.log('Fixed RadiologyRegistration.tsx');
