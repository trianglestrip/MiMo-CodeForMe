/** 产品名：界面品牌、问候语、关于页等 */
export const PRODUCT_NAME = 'BcAI'

/** 当前选中模型的展示名（多模型接入时随 settings 变化） */
export function modelDisplayName(name: string | undefined, id: string) {
  return name?.trim() || id
}
