module.exports = grammar({
    name: 'clingo',

    word: $ => $.identifier,

    inline: $ => [$._body_agg,
                  $.tuple,
                  $.argvec,
                  $.optional_conditional_literal,
                  $.classical_negation,
                  ],

    conflicts: $ => [
        [$.theory_term, $.theory_term],
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
        // conditions
        [$.condition, $._disjunctionsepelem],
        [$.condition, $.disjunction],
    ],

  rules: {

      source_file: $ => repeat(choice($.rule,
                                      $.fact,
                                      $.integrity_constraint,
                                      $.comment,
                                      $._optimisation,
                                      $._statement,
                                      $._script,
                                      $.theory_statement)),

      infimum: $ => /#inf(?:imum)?/,

      supremum: $ => /#sup(?:remum)?/,



      // skip constterm from yy which excludes variables and pools
      // api yy mix
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

      terms: $ => prec.right(seq(repeat(seq($.term, ',')), $.term)),


      // yy also allows optional
      argvec: $ => seq($.terms, repeat(seq(';', $.terms))),

      // api, enforced left
      interval: $ => prec.left(seq($.term, '..', $.term)),

      function: $ => choice($.identifier,
                            $._arg_function),

      _arg_function: $ => prec(1, seq($.identifier, '(', optional($.argvec), ')')),

      // yy also allows empty
      tuple: $ => choice($.terms, seq($.terms, ','), ','),

      // yy
      pool: $ => seq('(', optional(seq($.tuple, repeat(seq(';', $.tuple)))), ')'),

      string: $ => seq('"', repeat(choice(/[^\"\n]/, /\\[\"n]/)), '"'),

      default_negation: $ => 'not',

      // inlined to disambiguate from minus
      classical_negation: $ => alias('-', $.classical_negation),

      identifier: $ => /_*[a-z][A-Za-z0-9_\']*/, // includes defualt and override from the api

      variable: $ => /[_\']*[A-Z][\'A-Za-z0-9_]*/,

      number: $ => choice(/0|(?:[1-9][0-9]*)/, // decimal
                          /0x[0-9A-Fa-f]+/, // hexadecimal
                          /0o[1-7]+/, // octal
                          /0b[0-1]+/), // binary

      external_function: $ => seq('@', $.function), // python functions, etc.

      atom: $ =>  seq(optional($.classical_negation), $.function),

      // no explicit conditional literals as then ambiguous between literal and conditional literal.
      // instead, easy to check whether condition follows
      literal: $ => // api
          seq(optional($.default_negation),
              optional($.default_negation),
              choice($.boolean,
                     $.atom,
                     $.comparison)),

      // yy, use optional($._nlitvec) for litvec
      _nlitvec: $ => seq(repeat(seq($.literal, ',')), $.literal),

      boolean: $ => choice('#true', '#false'),

      // yy, inlines unaryargvec for abs case
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

      // yy
      comparison_predicate: $ => choice('=', '!=', '<', '<=', '>', '>='),

      // term + rellitvec from the yy
      comparison: $ => prec(1, seq($.term,
                                   repeat(seq($.comparison_predicate, $.term)),
                                   seq($.comparison_predicate, $.term))),

      condition: $ => seq(':', optional($._nlitvec)),

      optional_conditional_literal: $ => seq($.literal, optional($.condition)),

      // AKA a 'conjunction' in nongroundgrammar.yy
      conditional_literal: $ => seq($.literal, $.condition),

      /* aggregates start */

      // not in yy, but pair to upper guard
      lower_guard: $ => seq($.term, optional($.comparison_predicate)),

      // upper in yy and optional, so should wrap here
      upper_guard: $ => seq(optional($.comparison_predicate), $.term),

      // yy
      aggregatefunction: $ => choice('#sum', '#sum+', '#min', '#max', '#count'),

      // yy
      _bodyaggrelem: $ => prec(1, choice(seq(':', optional($._nlitvec)),
                                         seq($.terms, optional(seq(':', optional($._nlitvec)))))),

      // yy but MISSING theory_atom
      _lubodyaggregate: $ => alias(choice($._guarded__bodyaggregate_full,
                                          $._guarded__bodyaggregate_partial,
                                          $._bodyaggregate),
                                   $.aggregate),

      _guarded__bodyaggregate_full: $ => prec(2, seq($.lower_guard, $._bodyaggregate, $.upper_guard)),

      _guarded__bodyaggregate_partial: $ => prec(1,choice(seq($.lower_guard, $._bodyaggregate),
                                                          seq($._bodyaggregate, $.upper_guard))),

      _bodyaggregate: $ => choice(seq('{', '}'),
                                  seq('{',
                                      seq($.optional_conditional_literal,
                                          repeat(seq(';', $.optional_conditional_literal))),
                                      '}'),
                                 seq($.aggregatefunction, '{', '}'),
                                 seq($.aggregatefunction,
                                     '{',
                                     seq($._bodyaggrelem, repeat(seq(';', $._bodyaggrelem))),
                                     '}')),

      // yy
      _headaggrelemvec: $ => seq(optional($.terms), ':', $.optional_conditional_literal, repeat(seq(';', optional($.terms), ':', $.optional_conditional_literal))),

      // yy
      _altheadaggrelemvec: $ => seq($.optional_conditional_literal, repeat(seq(';', $.optional_conditional_literal))),

      // yy, MISSING theory_atom
      _luheadaggregate: $ => alias(choice($._guarded_headaggregate_full,
                                          $._guarded_headaggregate_partial,
                                          $._headaggregate),
                                   $.aggregate),

      _guarded_headaggregate_full: $ => prec(2, seq($.lower_guard, $._headaggregate, $.upper_guard)),

      _guarded_headaggregate_partial: $ => prec(1,choice(seq($.lower_guard, $._headaggregate),
                                                         seq($._headaggregate, $.upper_guard))),

      _headaggregate: $ => choice(seq('{', '}'),
                                 seq($.aggregatefunction, '{', '}'),
                                 seq($.aggregatefunction, '{', $._headaggrelemvec, '}'),
                                 seq('{', $._altheadaggrelemvec, '}')),

      /* aggregates end */

      _disjunctionsepelem: $ => repeat1(choice(
          seq($.literal, choice(',', ';', '|')),
          seq($.literal, ':', ';'),
          seq($.literal, ':', $._nlitvec, choice(';', '|'))
      )),

      // yy
      disjunction: $ => choice(seq($._disjunctionsepelem, $.optional_conditional_literal),
                               $.conditional_literal),

      /* rules */

      // yy as statement
      fact: $ => seq($._head, '.'),

      integrity_constraint: $ => prec(1, seq(':-', $._body, '.')),


      _head: $ => choice($.literal,
                         $._luheadaggregate,
                         $.disjunction,
                         $.theory_atom
                        ),

      head: $ => $._head,

      // inlined
      _body_agg: $ => seq(optional($.default_negation),
                          optional($.default_negation),
                          choice($._lubodyaggregate,
                                 $.theory_atom)),

      _body: $ => seq(repeat(choice(seq(choice($.literal,
                                               $._body_agg),
                                        choice(',',
                                               ';')),
                                    seq($.conditional_literal, ';'))),
                      choice($.literal,
                             $._body_agg,
                             $.conditional_literal)),

      body: $ => $._body,

      rule: $ => prec(1,seq(optional($.head), ':-', optional($.body), '.')),

      /* rules end */

      /* optimisation */

      _optimisation: $ => choice($.weak_constraint,
                                 $.optimise_statement),

      _optimise_list_elem: $ => seq($.terms,
                                   optional(seq(':', optional(seq($.literal, repeat(seq(',', $.literal))))))),

      priority: $ => seq('@', $.term),

      weight: $ => $.term,

      optimise_weight: $ => seq($.weight, optional($.priority)),

      optimise_statement: $ => seq(
          choice('#maximize', '#minimize', '#maximise', '#minimise'),
          '{',
          optional(seq($.optimise_weight,
                       ',',
                       $._optimise_list_elem, repeat(seq(';', $._optimise_list_elem)))),
          '}', '.'),

      weak_constraint: $ => seq(':~', optional($.body), '.',
                                '[', $.optimise_weight, optional(seq(',', $.terms)), ']'),

      /* optimisation end */

      // api, not yy
      comment: $ => token(choice(seq('%', /[^\n]*/),
                                 seq('%*', /(?:(?:[^\*])|(?:\*[^%]))+/, '*%'))),

      _statement: $ => choice($.show_statement,
                              $.warning_statement,
                              $.edge_statement,
                              $.heuristic_statement,
                              $.projection_statement,
                              $.const_statement,
                              $.include_statement,
                              $.block_statement,
                              $.external_statement),

      // yy
      show_statement: $ => seq(choice(seq('#show', optional(seq($.term, optional(seq(':', $.body))))),
                                      seq('#showsig', optional($.classical_negation), $.identifier, '/', $.number)),
                               '.'),
      // yy
      warning_statement: $ => seq('#defined', optional($.classical_negation), $.identifier, '/', $.number, '.'),

      // yy
      binaryargvec: $ => seq($.term, ',', $.term, repeat(seq(';', $.term, ',', $.term))),
      // yy
      edge_statement: $ => seq('#edge', '(', $.binaryargvec, ')', optional(seq(':', optional($.body))),  '.'),

      // yy
      heuristic_statement: $ => seq('#heuristic', $.atom, optional(seq(':', optional($.body))), '.',
                                    '[', $.term, optional(seq('@', $.term)), ',', $.term, ']'),

      // yy
      projection_statement: $ => seq('#project',
                                     choice(seq(optional($.classical_negation), $.identifier, '/', $.number, '.'),
                                            seq($.atom, optional(seq(':', optional($.body))),  '.'))),

      // yy, though term should really be restricted to be a constant term
      const_statement: $ => seq('#const', $.identifier, '=', $.term, '.',
                                optional(seq('[', choice('default', 'override'), ']'))),

      // yy
      include_statement: $ => seq('#include', choice($.string, seq('<', $.identifier, '>')), '.'),

      // yy
      block_statement: $ => seq('#program',
                                $.identifier,
                                optional(seq('(',
                                             optional(seq($.identifier,
                                                          repeat(seq(',', $.identifier)))),
                                             ')')),'.'),

      // yy
      external_statement: $ => seq('#external', $.atom, optional(seq(':', optional($.body))), '.',
                                   optional(seq('[', $.term, ']'))),

      /* script stuff */
      // not yy, and currently incomplete

      _script: $ => choice(
          $.python,
          $.lua
      ),

      script_contents: $ => /(?:(?:[^#])|(?:#[^e])|(?:#e[^n])|(?:#en[^d])|(?:#end[^\.]))+/,

      python: $ => seq('#script', '(python)', $.script_contents, '#end\.'),

      lua: $ => seq('#script', '(lua)', $.script_contents, '#end\.'),

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

      theory_terms: $ => prec.right(seq(repeat(seq($.theory_term, ',')), $.theory_term)),

      theory_term: $ => choice($._basic_theory_term,
                               seq($.theory_operator, $.theory_term),
                               seq($.theory_term, $.theory_operator, $.theory_term),
                               seq('{', optional($.theory_terms), '}'),
                               seq('[', optional($.theory_terms), ']'),
                               seq('(', optional(seq($.theory_terms, optional(','))), ')'),
                               seq($.identifier, '(', optional($.theory_terms), ')')),

      theory_atom_element: $ => choice(seq($.theory_terms, optional($.condition)),
                                       $.condition),

      theory_atom_elements: $ => seq($.theory_atom_element, repeat(seq(';', $.theory_atom_element))),

      _theory_atom_name: $ => choice($.identifier,
                                     seq('(', $.identifier, ')')),

      theory_atom: $ => choice(
          seq('\&', $._theory_atom_name),
          seq('\&', $._theory_atom_name, '{', optional($.theory_atom_elements), '}'),
          seq('\&', $._theory_atom_name, '{', optional($.theory_atom_elements), '}', $.theory_operator, $.theory_term)
      ),

      theory_operator_definition: $ => choice(seq($.theory_operator, ':', alias($.number, $.precedence), ',', alias('unary', $.arity)),
                                              seq($.theory_operator, ':', alias($.number, $.precedence), ',', alias('binary', $.arity), ',', alias(choice('left', 'right'), $.associativity))),

      theory_operator_definitions: $ => seq($.theory_operator_definition, repeat(seq(';', $.theory_operator_definition))),

      theory_term_definition: $ => seq($.identifier, '{', optional($.theory_operator_definitions), '}'),

      theory_atom_type: $ => choice('head', 'body', 'any', 'directive'),

      theory_term_operators: $ => seq($.theory_operator, repeat(seq(',', $.theory_operator))),

      theory_atom_definition: $ => seq('&', $.identifier, '/', alias($.number, $.arity), ':', alias($.identifier, $.theory_term_identifier), ',',
                                       optional(seq('{', optional($.theory_term_operators), '}', ',', alias($.identifier, $.theory_term_identifier), ',')),
                                       $.theory_atom_type),

      theory_definitions: $ => seq(repeat(seq(choice($.theory_atom_definition,
                                                          $.theory_term_definition), ';')), choice($.theory_atom_definition,
                                                                                              $.theory_term_definition)),

      theory_statement: $ => seq('#theory', $.identifier, '{', optional($.theory_definitions), '}', '.'),

      /* other */
  }
});
