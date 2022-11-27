export enum TokenType {
  // Single-character tokens.
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_SQUARE = 'LEFT_SQUARE',
  RIGHT_SQUARE = 'RIGHT_SQUARE',
  COMMA = 'COMMA',
  DOT = 'DOT',
  MINUS = 'MINUS',
  PLUS = 'PLUS',
  COLON = 'COLON',
  SLASH = 'SLASH',
  STAR = 'STAR',
  QUESTION_MARK = 'QUESTION_MARK',

  // One or two character tokens.
  BANG = 'BANG',
  BANG_EQUAL = 'BANG_EQUAL',
  EQUAL = 'EQUAL',
  EQUAL_EQUAL = 'EQUAL_EQUAL',
  GREATER = 'GREATER',
  GREATER_EQUAL = 'GREATER_EQUAL',
  LESS = 'LESS',
  LESS_EQUAL = 'LESS_EQUAL',
  AMPER_AMPER = 'AMPER_AMPER',
  PIPE_PIPE = 'PIPE_PIPE',

  // Literals.
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',

  // Keywords.
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',

  EOF = 'EOF',
}
