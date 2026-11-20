/**
 * CanadaAddressFields — reusable Canada-format address form fields
 *
 * Props:
 *   value: { street, city, province, postalCode }
 *   onChange: (updatedAddress) => void
 *   required: bool (applies to street, city, province, postalCode)
 */

export const CANADA_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

/**
 * Formats a postal code as user types — inserts space after 3rd char.
 * e.g. "M5V2T6" → "M5V 2T6"
 */
export function formatPostalCode(raw = '') {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (clean.length > 3) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return clean;
}

/**
 * Converts the 4-field address object to a single string for display.
 */
export function formatAddressString({ street, city, province, postalCode } = {}) {
  const parts = [street, city, province, postalCode, 'Canada'].filter(Boolean);
  return parts.join(', ');
}

/**
 * Parses a legacy single-string address back into fields (best effort).
 */
export function parseAddressString(str = '') {
  const parts = str.split(',').map((p) => p.trim()).filter(Boolean);
  return {
    street:     parts[0] || '',
    city:       parts[1] || '',
    province:   parts[2] || '',
    postalCode: parts[3] || '',
  };
}

export default function CanadaAddressFields({ value = {}, onChange }) {
  const { street = '', city = '', province = '', postalCode = '' } = value;

  const update = (key, val) => onChange({ ...value, [key]: val });

  return (
    <div className="space-y-3">
      {/* Street */}
      <div>
        <label className="label">Street Address</label>
        <input
          type="text"
          value={street}
          onChange={(e) => update('street', e.target.value)}
          className="input"
          placeholder="123 Main St, Apt 4B"
        />
      </div>

      {/* City + Province */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => update('city', e.target.value)}
            className="input"
            placeholder="Toronto"
          />
        </div>
        <div>
          <label className="label">Province</label>
          <select
            value={province}
            onChange={(e) => update('province', e.target.value)}
            className="input"
          >
            <option value="">— Select Province —</option>
            {CANADA_PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Postal Code + Country (fixed) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Postal Code</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => update('postalCode', formatPostalCode(e.target.value))}
            className="input"
            placeholder="M5V 2T6"
            maxLength={7}
          />
          {postalCode && !/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(postalCode.replace(' ', '')) && (
            <p className="text-xs text-amber-600 mt-1">Format: A1A 1A1</p>
          )}
        </div>
        <div>
          <label className="label">Country</label>
          <input
            type="text"
            value="Canada"
            readOnly
            className="input bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
