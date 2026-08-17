# Provider registration validation audit
## provider-app/src/screens/doctor/DoctorRegistration.tsx
26:import { ProviderApi, sanitizeWizardData } from '../../api/provider';
138:  const validate = () => {
954:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.lat, lng: data.lng , signature_url: sigUrl, full_data: sanitizeWizardData(data) });
## provider-app/src/screens/pharmacy/PharmacyRegistration.tsx
10:import { ProviderApi, sanitizeWizardData } from '../../api/provider';
129:  const validate = () => {
226:  const validate = () => {
341:  const validate = () => {
794:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });
## provider-app/src/screens/lab/LabRegistration.tsx
9:import { ProviderApi, sanitizeWizardData } from '../../api/provider';
162:  const validate = () => {
338:  const validate = () => {
569:  const validate = () => {
833:  const validate = () => {
1662:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });
## provider-app/src/screens/radiology/RadiologyRegistration.tsx
9:import { ProviderApi, sanitizeWizardData } from '../../api/provider';
162:  const validate = () => {
338:  const validate = () => {
569:  const validate = () => {
833:  const validate = () => {
1662:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });
## provider-app/src/screens/nursing/NursingRegistration.tsx
9:import { ProviderApi, sanitizeWizardData } from '../../api/provider';
133:  const validate = () => {
250:  const validate = () => {
406:  const validate = () => {
501:  const validate = () => {
877:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });
