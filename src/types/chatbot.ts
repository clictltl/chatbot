/**
 * TIPOS E INTERFACES DO CHATBOT
 *
 * Este arquivo define toda a estrutura de dados usada no editor de chatbot.
 * Ele é o "esqueleto" que mantém tudo organizado e facilita futuras extensões.
 */

// Tipos de blocos disponíveis no chatbot
export type BlockType = "start" |"message" | "openQuestion" | "choiceQuestion" | "condition" | "setVariable" | "math" | "image" | "end";



/**
 * BLOCO - Unidade básica do fluxo do chatbot
 *
 * Cada bloco representa uma etapa da conversa e pode ser:
 * - message: Exibe uma mensagem do bot
 * - openQuestion: Faz uma pergunta e espera texto livre
 * - choiceQuestion: Apresenta botões com opções
 * - condition: Avalia uma condição e decide o próximo passo
 * - setVariable: Define o valor de uma variável sem interação do usuário
 * - math: Realiza operações matemáticas com variáveis numéricas
 * - image: Exibe uma imagem (URL ou upload)
 * - end: Finaliza a conversa
 */
export interface Block {
  id: string;                             // Identificador único do bloco
  type: BlockType;                        // Tipo do bloco (define seu comportamento)
  position: { x: number; y: number };     // Posição no canvas para desenho
  content: string;                        // Texto exibido pelo bloco
  choices?: Choice[];                     // Opções (apenas para choiceQuestion)
  variableName?: string;                  // Nome da variável a salvar (para openQuestion e setVariable)
  variableValue?: string;                 // Valor a atribuir à variável (apenas para setVariable)
  conditions?: Condition[];               // Condições a avaliar (apenas para condition)
  mathOperation?: "+" | "-" | "*" | "/";  // Operação matemática (para math)
  mathValue?: string;                     // Valor ou variável para operação (para math)
  imageUrl?: string;                      // URL da imagem (para image)
  imageData?: string;                     // Dados base64 da imagem (para image com upload)
  nextBlockId?: string;                   // ID do próximo bloco (quando aplicável)
}

/**
 * ESCOLHA - Opção em uma pergunta de múltipla escolha
 *
 * Cada escolha tem um rótulo visível e aponta para um próximo bloco
 */
export interface Choice {
  id: string;                             // Identificador único da escolha
  label: string;                          // Texto exibido no botão
  nextBlockId?: string;                   // ID do bloco para onde a escolha leva
}

/**
 * CONDIÇÃO - Regra lógica em um bloco condicional
 *
 * Compara o valor de uma variável com um valor esperado
 * Exemplo: se idade >= 18, vai para bloco_adulto
 */
export interface Condition {
  id: string;                             // Identificador único da condição
  variableName: string;                   // Nome da variável a comparar
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=";  // Operador de comparação
  value: string | number;                 // Valor a comparar
  nextBlockId?: string;                   // ID do bloco se condição for verdadeira
}

/**
 * CONEXÃO - Linha visual entre dois blocos no canvas
 *
 * Representa a ligação entre um bloco de origem e um de destino.
 * Pode sair do handle principal ou de uma escolha/condição específica.
 */
export interface Connection {
  id: string;                             // Identificador único da conexão
  fromBlockId: string;                    // ID do bloco de origem
  fromOutputId?: string;                  // ID da escolha/condição de origem (se houver)
  toBlockId: string;                      // ID do bloco de destino
  waypoints?: { x: number; y: number }[]; // Pontos intermediários para personalizar o caminho
}

/**
 * VARIÁVEL - Armazena informação coletada durante a conversa
 *
 * Variáveis podem ser usadas para:
 * - Guardar respostas do usuário
 * - Fazer decisões condicionais
 * - Personalizar mensagens com {{nome}} por exemplo
 */
export interface Variable {
  name: string;                           // Nome da variável (ex: "nome", "idade")
  type: "string" | "number";              // Tipo de dado armazenado
  value: string | number | null;          // Valor atual da variável
}

/**
 * MENSAGEM DO CHAT - Representa uma linha no preview do chat
 *
 * Usada apenas durante o teste do chatbot no painel de preview
 */
export interface ChatMessage {
  id: string;                             // Identificador único da mensagem
  type: "bot" | "user" | "image";         // Quem enviou: bot, usuário ou imagem
  content: string;                        // Texto da mensagem ou URL da imagem
}
