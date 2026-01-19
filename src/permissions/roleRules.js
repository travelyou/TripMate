import { ROLES } from './roles'

export const CAPABILITIES = {
  // Post capabilities
  CREATE_POST: 'CREATE_POST',
  EDIT_OWN_POST: 'EDIT_OWN_POST',
  DELETE_OWN_POST: 'DELETE_OWN_POST',

  // Vendor capabilities
  ACCESS_VENDOR_DasHBOARD: 'ACCESS_VENDOR_DasHBOARD',
  MANAGE_PRODUCTS: 'MANAGE_PRODUCTS',
}

const RULES = {

  [ROLES.USER]: [
    CAPABILITIES.CREATE_POST,
    CAPABILITIES.EDIT_OWN_POST,
    CAPABILITIES.DELETE_OWN_POST
  ],
  [ROLES.VENDOR]: [
    CAPABILITIES.CREATE_POST,
    CAPABILITIES.EDIT_OWN_POST,
    CAPABILITIES.DELETE_OWN_POST,
    CAPABILITIES.ACCESS_VENDOR_DasHBOARD,
    CAPABILITIES.MANAGE_PRODUCTS
  ],
  [ROLES.ADMIN]: [
    // 暫無權限定義
  ]
}

export function checkCapability(role, capability) {
  if (role === ROLES.ADMIN) return true
  const caps = RULES[role] || []
  return caps.includes(capability)
}
