// Regra de senha: minimo 8 caracteres, ao menos 1 numero e 1 caractere especial.
export const REGRA_SENHA = 'A senha deve ter pelo menos 8 caracteres, com ao menos um número e um caractere especial (ex.: ! @ # $ %).'

export function validarSenha(senha) {
  return typeof senha === 'string'
    && senha.length >= 8
    && /\d/.test(senha)
    && /[^A-Za-z0-9\s]/.test(senha)
}
