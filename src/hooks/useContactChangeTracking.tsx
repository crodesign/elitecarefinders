import { useContactEdits } from './useContactEdits';

export interface ContactChangeTracker {
  trackChange: (contactId: string, changeDescription: string) => Promise<void>;
}

export function useContactChangeTracking(): ContactChangeTracker {
  const trackChange = async (contactId: string, changeDescription: string) => {
    // This is handled directly in the contacts update functions
    console.log(`Contact ${contactId} changed: ${changeDescription}`);
  };

  return {
    trackChange
  };
}

// Helper function to compare contact objects and generate change descriptions
export function generateChangeDescription(oldContact: any, newContact: any): string {
  const changes: string[] = [];
  
  // Add detailed logging for debugging
  console.log('=== CHANGE TRACKING DEBUG ===');
  console.log('Old contact keys:', oldContact ? Object.keys(oldContact).filter(k => oldContact[k] !== null && oldContact[k] !== undefined && oldContact[k] !== '') : []);
  console.log('New contact keys:', newContact ? Object.keys(newContact).filter(k => newContact[k] !== null && newContact[k] !== undefined && newContact[k] !== '') : []);
  
  // Define fields to track with their display names (excluding arrays)
  const trackedFields = {
    first_name: 'First Name',
    last_name: 'Last Name',
    phone: 'Phone',
    email: 'Email',
    status: 'Status',
    street_address: 'Street Address',
    city: 'City',
    state: 'State',
    zip_code: 'Zip Code',
    date_of_birth: 'Date of Birth',
    gender: 'Gender',
    ethnicity: 'Ethnicity',
    care_level: 'Care Level',
    primary_insurance: 'Primary Insurance',
    pcp_name: 'Primary Care Physician',
    pcp_phone: 'PCP Phone',
    pcp_email: 'PCP Email',
    signature_date: 'Waiver Signature Date',
    height_feet: 'Height (feet)',
    height_inches: 'Height (inches)',
    weight: 'Weight'
  };

  // Helper function to normalize values for comparison
  const normalizeValue = (value: any) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string') return value.trim();
    return value;
  };

  // Check each tracked field for changes
  for (const [field, displayName] of Object.entries(trackedFields)) {
    const oldValue = normalizeValue(oldContact?.[field]);
    const newValue = normalizeValue(newContact?.[field]);
    
    // Only track if values are actually different
    if (oldValue !== newValue) {
      console.log(`Field ${field} changed:`, { oldValue, newValue });
      if (!oldValue && newValue) {
        changes.push(`${displayName} added: ${newValue}`);
      } else if (oldValue && !newValue) {
        changes.push(`${displayName} removed`);
      } else if (oldValue && newValue) {
        changes.push(`${displayName} changed from "${oldValue}" to "${newValue}"`);
      }
    }
  }

  // Check array fields with better comparison (moved mobility_level here where it belongs)
  const arrayFields = {
    dietary_needs: 'Dietary Needs',
    personal_care_assistance: 'Personal Care Assistance',
    health_conditions: 'Health Conditions',
    mobility_level: 'Mobility Level',
    room_type: 'Room Type',
    bathroom_type: 'Bathroom Type',
    shower_type: 'Shower Type',
    interests: 'Interests'
  };

  for (const [field, displayName] of Object.entries(arrayFields)) {
    const oldArray = (oldContact?.[field] || []).filter(Boolean).sort();
    const newArray = (newContact?.[field] || []).filter(Boolean).sort();
    
    if (JSON.stringify(oldArray) !== JSON.stringify(newArray)) {
      console.log(`Array field ${field} changed:`, { oldArray, newArray });
      changes.push(`${displayName} updated`);
    }
  }

  console.log('Total changes detected:', changes.length);
  console.log('Changes:', changes);
  console.log('=== END CHANGE TRACKING DEBUG ===');

  // Return empty string if no changes, otherwise return HTML list
  return changes.length > 0 ? `<ul><li>${changes.join('</li><li>')}</li></ul>` : '';
}