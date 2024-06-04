module.exports = grammar({
    name: 'clingo',

    word: $ => $.identifier,

    inline: $ => [$.tuple,
                  $.classical_negation,
                  $._basic_theory_term,
                  ],

    conflicts: $ => [
        [$._unary_theory_term, $._binary_theory_term],
        [$._binary_theory_term, $._binary_theory_term],
    ],

    precedences: $ => [
        // unary minus over every other arithmetic or bitwise function but absolute value
        [$.unary_minus, $.interval],
        [$.unary_minus, $.minus],
        [$.unary_minus, $.bitor],
        [$.unary_minus, $.bitxor],
        [$.unary_minus, $.bitand],
        [$.unary_minus, $.times],
        [$.unary_minus, $.plus],
        [$.unary_minus, $.divide],
        [$.unary_minus, $.modulo],
        [$.unary_minus, $.power],
        // unary minus over every other arithmetic or bitwise function but absolute value
        [$.bitneg, $.interval],
        [$.bitneg, $.minus],
        [$.bitneg, $.bitor],
        [$.bitneg, $.bitxor],
        [$.bitneg, $.bitand],
        [$.bitneg, $.times],
        [$.bitneg, $.plus],
        [$.bitneg, $.divide],
        [$.bitneg, $.modulo],
        [$.bitneg, $.power],
        // every arithmetic or bitwise function over interval
        [$.minus, $.interval],
        [$.bitor, $.interval],
        [$.bitxor, $.interval],
        [$.bitand, $.interval],
        [$.times, $.interval],
        [$.plus, $.interval],
        [$.divide, $.interval],
        [$.modulo, $.interval],
        [$.power, $.interval],
        // every arithmetic or bitwise function over lower guard
        [$.minus, $.lower_guard],
        [$.bitor, $.lower_guard],
        [$.bitxor, $.lower_guard],
        [$.bitand, $.lower_guard],
        [$.times, $.lower_guard],
        [$.plus, $.lower_guard],
        [$.divide, $.lower_guard],
        [$.modulo, $.lower_guard],
        [$.power, $.lower_guard],
        // every arithmetic or bitwise function over upper guard
        [$.minus, $.upper_guard],
        [$.bitor, $.upper_guard],
        [$.bitxor, $.upper_guard],
        [$.bitand, $.upper_guard],
        [$.times, $.upper_guard],
        [$.plus, $.upper_guard],
        [$.divide, $.upper_guard],
        [$.modulo, $.upper_guard],
        [$.power, $.upper_guard],
        //
        [$.integrity_constraint, $.rule]
    ],

  rules: {

      source_file: $ => repeat(choice($.rule,
                                      $.fact,
                                      $.integrity_constraint,
                                      $.comment,
                                      $.weak_constraint,
                                      $.statement,
                                      $._script,
                                      $.theory_statement)),

            /* rules */
      fact: $ => seq($._head, '.'),

      integrity_constraint: $ => seq(':-', $._body, '.'),

      _head: $ => choice($.literal,
                         alias($._head_aggregate, $.aggregate),
                         $.disjunction,
                         $.theory_atom),

      _body: $ => seq(repeat(choice(seq(choice($.literal,
                                               seq(optional($.default_negation),
                                                   optional($.default_negation),
                                                   choice(alias($._body_aggregate, $.aggregate),
                                                         $.theory_atom))),
                                        choice(',',
                                               ';')),
                                    seq($.conditional_literal, ';'))),
                      choice($.literal,
                             seq(optional($.default_negation),
                                 optional($.default_negation),
                                 choice(alias($._body_aggregate, $.aggregate),
                                       $.theory_atom)),
                             $.conditional_literal)),


      rule: $ => seq(optional(alias($._head, $.head)), ':-', optional(alias($._body, $.body)), '.'),

      /* rules end */

      term: $ => choice($.interval,
                         $._arithmetic_function,
                         $._bitwise_function,
                         $.function,
                         $.external_function,
                         // symbols
                         $.number,
                         $.string,
                         $.infimum,
                         $.supremum,
                         '_',
                         // symbols done
                         $.variable,
                         $.pool),

      infimum: $ => /#inf(?:imum)?/,

      supremum: $ => /#sup(?:remum)?/,

      terms: $ => prec.right(seq(repeat(seq($.term, ',')), $.term)),

      interval: $ => prec.left(seq($.term, '..', $.term)),

      _function_arguments: $ => seq(repeat(seq($.terms, choice(';', ','))), $.terms),

      function: $ => prec.right(seq($.identifier, optional(seq('(', optional($._function_arguments), ')')))),

      tuple: $ => seq($.terms, optional(',')),

      pool: $ => seq('(', optional(seq(repeat(seq($.tuple, ';')), $.tuple)), ')'),

      string: $ => seq('"', repeat(choice(/[^\"\n]/, /\\[\"n]/)), '"'),

      default_negation: $ => 'not',

      // inlined to disambiguate from minus
      classical_negation: $ => alias('-', $.classical_negation),

      identifier: $ => /_*[a-z][A-Za-z0-9_\']*/,

      variable: $ => /[_\']*[A-Z][\'A-Za-z0-9_]*/,

      number: $ => choice(/0|(?:[1-9][0-9]*)/, // decimal
                          /0x[0-9A-Fa-f]+/, // hexadecimal
                          /0o[1-7]+/, // octal
                          /0b[0-1]+/), // binary

      external_function: $ => seq('@', $.function), // python functions, etc.

      atom: $ =>  seq(optional($.classical_negation), $.function),

      // no explicit conditional literals as then ambiguous between literal and conditional literal.
      // instead, easy to check whether condition follows
      literal: $ => seq(optional($.default_negation),
                        optional($.default_negation),
                        choice($.boolean,
                               $.atom,
                               $.comparison)),

      _literals: $ => seq(repeat(seq($.literal, ',')), $.literal),

      boolean: $ => choice('#true', '#false'),

      _arithmetic_function: $ => choice($.plus,
                                        $.minus,
                                        $.times,
                                        $.divide,
                                        $.modulo,
                                        $.power,
                                        alias($.unary_minus, $.minus),
                                        $.absolute),

      _bitwise_function: $ => choice($.bitor,
                                     $.bitxor,
                                     $.bitand,
                                     $.bitneg),

      bitor: $ => prec.left(seq($.term, '?', $.term)),

      bitxor: $ => prec.left(seq($.term, '^', $.term)),

      bitand: $ => prec.left(seq($.term, '&', $.term)),

      plus: $ => prec.left(seq($.term, '+', $.term)),

      minus: $ => prec.left(seq($.term, '-', $.term)),

      times: $ => prec.left(seq($.term, '*', $.term)),

      divide: $ => prec.left(seq($.term, '/', $.term)),

      modulo: $ => prec.left(seq($.term, '\\', $.term)),

      power: $ => prec.right(seq($.term, choice('**'), $.term)),

      unary_minus: $ => seq('-', $.term),

      bitneg: $ => seq('~', $.term),

      absolute: $ => seq('|', seq(repeat(seq($.term, ';')), $.term), '|'),

      comparison_predicate: $ => choice('=', '!=', '<', '<=', '>', '>=', '=='),

      lower_guard: $ => seq($.term, optional($.comparison_predicate)),

      upper_guard: $ => seq(optional($.comparison_predicate), $.term),

      comparison: $ => seq($.term,
                           $.comparison_predicate,
                           repeat(seq($.term, $.comparison_predicate)),
                           $.term,),

      condition: $ => seq(':', optional($._literals)),

      _optional_conditional_literal: $ => seq($.literal, optional($.condition)),

      // AKA a 'conjunction' in nongroundgrammar.yy
      conditional_literal: $ => seq($.literal, $.condition),

      /* aggregates start */
      _aggregate_function_directive: $ => seq('#', $.aggregate_function),

      aggregate_function: $ => choice('sum', 'sum+', 'min', 'max', 'count'),

      _body_aggregate_element: $ => choice($.condition,
                                           seq($.terms, optional($.condition))),

      _body_aggregate: $ =>
      seq(
          optional($.lower_guard),
          choice(seq('{',
                     optional(seq(repeat(seq($._optional_conditional_literal, ';')), $._optional_conditional_literal,)),
                     '}'),
                 seq(alias($._aggregate_function_directive, $.directive),
                     '{',
                     optional(seq(repeat(seq($._body_aggregate_element, ';')), $._body_aggregate_element)),
                     '}')),
          optional($.upper_guard),
      ),

      _head_aggregate_elements: $ => seq(optional($.terms), ':', $._optional_conditional_literal, repeat(seq(';', optional($.terms), ':', $._optional_conditional_literal))),

      _althead_aggregate_elements: $ => seq(repeat(seq($._optional_conditional_literal, ';')), $._optional_conditional_literal),

      _head_aggregate: $ => seq(
          optional($.lower_guard),
          choice(seq('{', '}'),
                 seq(alias($._aggregate_function_directive, $.directive),
                     '{', optional($._head_aggregate_elements), '}'),
                 seq('{', $._althead_aggregate_elements, '}')),
          optional($.upper_guard)),

      /* aggregates end */

      _disjunction_elememt: $ => repeat1(choice(seq($.literal, choice(',', ';', '|')),
                                                seq($.literal, ':', ';'),
                                                seq($.literal, ':', $._literals, choice(';', '|')))),

      disjunction: $ => choice(seq($._disjunction_elememt, $._optional_conditional_literal),
                               $.conditional_literal),


      /* optimisation */
      _optimize_list_elem: $ => seq($.terms, optional($.condition)),

      priority: $ => seq('@', $.term),

      weight: $ => $.term,

      optimize_weight: $ => seq($.weight, optional($.priority)),

      _optimize_directive: $ => seq('#', $.optimization),

      optimization: $ => choice('maximize', 'minimize', 'maximise', 'minimise'),

      _optimize_statement: $ => seq(
          alias($._optimize_directive, $.directive),
          '{',
          optional(seq($.optimize_weight,
                       ',',
                       repeat(seq($._optimize_list_elem, ';')), $._optimize_list_elem)),
          '}', '.'),

      weak_constraint: $ => seq(':~', optional(alias($._body, $.body)), '.',
                                '[', $.optimize_weight, optional(seq(',', $.terms)), ']'),

      /* optimisation end */

      comment: $ => token(choice(seq('%', /[^\n]*/),
                                 seq('%*', /(?:(?:[^\*])|(?:\*[^%]))+/, '*%'))),

      statement: $ => choice($._show_statement,
                             $._defined_statement,
                             $._edge_statement,
                             $._heuristic_statement,
                             $._projection_statement,
                             $._const_statement,
                             $._include_statement,
                             $._program_statement,
                             $._external_statement,
                             $._optimize_statement),

      _show_directive: $ => seq('#', $.show),

      show: $ => 'show',

      arity: $ => $.number,

      _show_statement: $ => seq(choice($._show_statement_atom,
                                       $._show_statement_term)),

      _show_statement_atom: $ => seq(alias($._show_directive, $.directive),
                                     optional($.classical_negation), $.identifier, '/', $.arity, '.'),

      _show_statement_term: $ => seq(alias($._show_directive, $.directive),
                                     optional(seq($.term, optional(seq(':', alias($._body, $.body))))), '.'),

      _defined_directive: $ => seq('#', $.defined),

      defined: $ => 'defined',

      _defined_statement: $ => seq(alias($._defined_directive, $.directive),
                                   optional($.classical_negation), $.identifier, '/', $.arity, '.'),

      _edge_directive: $ => seq('#', $.edge),

      edge: $ => 'edge',

      _edge_statement: $ => seq(alias($._edge_directive, $.directive),
                               '(', seq(repeat(seq($.term, ',', $.term, ';')), $.term, ',', $.term), ')',
                               optional(seq(':', optional(alias($._body, $.body)))),  '.'),

      weight: $ => $.term,

      bias: $ => $.term,

      priority: $ => seq('@', $.term),

      modifier: $ => $.term,

      _heuristic_directive: $ => seq('#', $.heuristic),

      heuristic: $ => 'heuristic',

      _heuristic_statement: $ => seq(alias($._heuristic_directive, $.directive),
                                     $.atom, optional(seq(':', optional(alias($._body, $.body)))), '.',
                                    '[', $.bias, optional($.priority), ',', $.modifier, ']'),

      _project_directive: $ => seq('#', $.project),

      project: $ => 'project',

      _projection_statement: $ => seq(alias($._project_directive, $.directive),
                                      choice(seq(optional($.classical_negation), $.identifier, '/', $.arity, '.'),
                                             seq($.atom, optional(seq(':', optional(alias($._body, $.body)))),  '.'))),

      _const_directive: $ => seq('#', $.const),

      const: $ => 'const',

      _const_statement: $ => seq(alias($._const_directive, $.directive),
                                $.identifier, '=', $.term, '.',
                                optional(seq('[', choice('default', 'override'), ']'))),

       _include_directive: $ => seq('#', $.include),

      include: $ => 'include',

      _include_statement: $ => seq(alias($._include_directive, $.directive),
                                  choice($.string, seq('<', $.identifier, '>')), '.'),

      _program_directive: $ => seq('#', $.program),

      program: $ => 'program',

      _program_statement: $ => seq(alias($._program_directive, $.directive),
                                $.identifier, optional(seq('(', optional(seq(repeat(seq($.identifier, ',')), $.identifier)), ')')),'.'),

       _external_directive: $ => seq('#', $.external),

      external: $ => 'external',

      _external_statement: $ => seq(alias($._external_directive, $.directive),
                                   $.atom, optional(seq(':', optional(alias($._body, $.body)))), '.',
                                   optional(seq('[', $.term, ']'))),

      /* script stuff */
      _script: $ => choice(
          $.python,
          $.lua
      ),

      _script_directive: $ => seq('#', $.script),

      script: $ => 'script',

      script_contents: $ => /(?:(?:[^#])|(?:#[^e])|(?:#e[^n])|(?:#en[^d])|(?:#end[^\.]))+/,

      python: $ => seq(alias($._script_directive, $.directive),
                       '(python)', $.script_contents, '#end\.'),

      lua: $ => seq(alias($._script_directive, $.directive),
                    '(lua)', $.script_contents, '#end\.'),

      /* script stuff end */

      /* theories */
      _basic_theory_op: $ => /[\/!<=>+\-*\\?&@|~\^]/,

      _combination_only_theory_op: $ => /[\/!<=>+\-*\\?&@|~\^:;\.][\/!<=>+\-*\\?&@|~\^:;\.]+/,

      theory_operator: $ => choice('not',
                             $._basic_theory_op,
                             $._combination_only_theory_op),

      _basic_theory_term: $ => choice($.identifier,
                                      $.number,
                                      $.string,
                                      $.infimum,
                                      $.supremum,
                                      $.variable),

      _unary_theory_term: $ => seq($.theory_operator, $.theory_term),

      _binary_theory_term: $ => seq($.theory_term, $.theory_operator, $.theory_term),

      theory_terms: $ => seq(repeat(seq($.theory_term, ',')), $.theory_term),

      _theory_term_tuple: $ => seq('(', optional(seq(alias(seq(repeat(seq($.theory_term, ',')), $.theory_term), $.theory_terms), optional(','))), ')'),

      theory_term: $ => choice($._basic_theory_term,
                               $._unary_theory_term,
                               $._binary_theory_term,
                               seq('{', optional($.theory_terms), '}'),
                               seq('[', optional($.theory_terms), ']'),
                               $._theory_term_tuple,
                               seq($.identifier, '(', optional($.theory_terms), ')')),

      theory_atom_element: $ => choice(seq($.theory_terms, optional($.condition)),
                                       $.condition),

      theory_atom_elements: $ => seq(repeat(seq($.theory_atom_element, ';')), $.theory_atom_element),

      _theory_atom_name: $ => choice($.identifier,
                                     seq('(', $.identifier, ')')),

      theory_atom: $ => choice(
          seq('&', $._theory_atom_name, optional(seq('{', optional($.theory_atom_elements), '}', optional(seq($.theory_operator, $.theory_term))))),
      ),


      _unary_arity: $ => alias('unary', $.string),

      _binary_arity: $ => alias('binary', $.string),


      theory_operator_definition: $ => choice(seq($.theory_operator, ':', alias($.number, $.precedence), ',', alias($._unary_arity, $.arity)),
                                              seq($.theory_operator, ':', alias($.number, $.precedence), ',', alias($._binary_arity, $.arity), ',', alias(choice('left', 'right'), $.associativity))),

      theory_operator_definitions: $ => seq(repeat(seq($.theory_operator_definition, ';')), $.theory_operator_definition),

      theory_term_definition: $ => seq($.identifier, '{', optional($.theory_operator_definitions), '}'),

      theory_atom_type: $ => choice('head', 'body', 'any', 'directive'),

      theory_term_operators: $ => seq(repeat(seq($.theory_operator, ',')), $.theory_operator),

      theory_atom_definition: $ => seq('&', $.identifier, '/', $.arity, ':', alias($.identifier, $.theory_term_identifier), ',',
                                       optional(seq('{', optional($.theory_term_operators), '}', ',', alias($.identifier, $.theory_term_identifier), ',')),
                                       $.theory_atom_type),

      theory_definitions: $ => seq(repeat(seq(choice($.theory_atom_definition,
                                                          $.theory_term_definition), ';')), choice($.theory_atom_definition,
                                                                                                   $.theory_term_definition)),

      _theory_directive: $ => seq('#', $.theory),

      theory: $ => 'theory',

      theory_statement: $ => seq(alias($._theory_directive, $.directive),
                                 $.identifier, '{', optional($.theory_definitions), '}', '.'),

      /* other */
  }
});
