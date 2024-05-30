module.exports = grammar({
    name: 'clingo',

    word: $ => $.identifier,

    inline: $ => [$._body_agg,
                  $.tuple,
                  $.argvec,
                  $.optional_conditional_literal,
                  $.classical_negation,
                  ],

  rules: {

      source_file: $ => repeat(choice($.rule,
                                      $.fact,
                                      $.integrity_constraint,
                                      $.comment,
                                      $._optimisation,
                                      $._statement,
                                      $._script)),


      // skip constterm from yy which excludes variables and pools
      // api yy mix
      _term: $ => choice($.interval,
                        $._arithmetic_function,
                        $._bitwise_function,
                        $.function,
                        $.external_function,
                        // symbols
                        $.number,
                        $.string,
                        /"#inf(?:imum)?/,
                        /#sup(?:remum)?/,
                        '_',
                        // symbols done
                        $.variable,
                        $.pool),

      _single_term: $ => alias($._term, $.term),

      terms: $ => prec.right(1, seq($._term, ',', $._term, repeat(seq(',', $._term)))),

      // yy i think this should be right, non-empty termvec --- i.e. if used also allow empty (wrap in optional)
      _ntermvec: $ => choice($._single_term,
                             $.terms),

      // yy also allows optional
      argvec: $ => seq($._ntermvec, repeat(seq(';', $._ntermvec))),

      // api, enforced left
      interval: $ => prec.left(seq($._single_term, '..', $._single_term)),

      function: $ => choice($.identifier,
                            $._arg_function),

      _arg_function: $ => prec(1, seq($.identifier, '(', optional($.argvec), ')')),

      // yy also allows empty
      tuple: $ => choice($._ntermvec, seq($._ntermvec, ','), ','),

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

      // yy, use optional($.nlitvec) for litvec
      _nlitvec: $ => seq($.literal, repeat(seq(',', $.literal))),

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

      bitor: $ => prec.left(1, seq($._single_term, '?', $._single_term)),

      bitxor: $ => prec.left(2, seq($._single_term, '^', $._single_term)),

      bitand: $ => prec.left(3, seq($._single_term, '&', $._single_term)),

      plus: $ => prec.left(3, seq($._single_term, '+', $._single_term)),      plus: $ => prec.left(3, seq($._single_term, '+', $._single_term)),

      minus: $ => prec.left(3, seq($._single_term, '-', $._single_term)),

      times: $ => prec.left(4, seq($._single_term, '*', $._single_term)),

      divide: $ => prec.left(4, seq($._single_term, '/', $._single_term)),

      modulo: $ => prec.left(4, seq($._single_term, '\\', $._single_term)),

      power: $ => prec.right(5, seq($._single_term, choice('**'), $._single_term)),

      unary_minus: $ => prec(6, seq('-', $._single_term)),

      bitneg: $ => prec(6, seq('~', $._single_term)),

      absolute: $ => prec(7, seq('|', seq(repeat(seq($._single_term, ';')), $._single_term), '|')),

      // yy
      comparison_predicate: $ => choice('=', '!=', '<', '<=', '>', '>='),

      // term + rellitvec from the yy
      comparison: $ => prec(1, seq($._single_term,
                                   repeat(seq($.comparison_predicate, $._single_term)),
                                   seq($.comparison_predicate, $._single_term))),

      condition: $ => prec(1, seq(':', optional(seq($.literal, repeat(seq(',', $.literal)))))),

      optional_conditional_literal: $ => choice($.literal, $.conditional_literal),

      conditional_literal: $ => seq($.literal, $.condition),

      /* aggregates start */

      // not in yy, but pair to upper guard
      lower_guard: $ => seq($._single_term, optional($.comparison_predicate)),

      // upper in yy and optional, so should wrap here
      upper_guard: $ => seq(optional($.comparison_predicate), $._single_term),

      // yy
      aggregatefunction: $ => choice('#sum', '#sum+', '#min', '#max', '#count'),

      // yy
      _bodyaggrelem: $ => prec(1, choice(seq(':', optional($._nlitvec)),
                                        seq($._ntermvec, optional(seq(':', optional($._nlitvec)))))),

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
      _headaggrelemvec: $ => seq(optional($._ntermvec), ':', $.optional_conditional_literal, repeat(seq(';', optional($._ntermvec), ':', $.optional_conditional_literal))),

      // yy
      _altheadaggrelemvec: $ => seq($.optional_conditional_literal, repeat(seq(';', $.optional_conditional_literal))),

      // yy, MISSING theory_atom
      _luheadaggregate: $ => alias(choice($._guarded_headaggregate_full,
                                         $._guarded_headaggregate_partial,
                                         $._headaggregate,),
                                  $.aggregate),

      _guarded_headaggregate_full: $ => prec(2, seq($.lower_guard, $._headaggregate, $.upper_guard)),

      _guarded_headaggregate_partial: $ => prec(1,choice(seq($.lower_guard, $._headaggregate),
                                                         seq($._headaggregate, $.upper_guard))),

      _headaggregate: $ => choice(seq('{', '}'),
                                 seq($.aggregatefunction, '{', '}'),
                                 seq($.aggregatefunction, '{', $._headaggrelemvec, '}'),
                                 seq('{', $._altheadaggrelemvec, '}')),

      /* aggregates end */

      // yy
      _conjunction: $ => choice($.conditional_literal,
                               seq($.literal, ':', optional($._nlitvec))),

      _disjunctionsepelem: $ => choice(seq($.literal, ','),
                                       seq($.literal, choice(';', '|')),
                                       seq(choice($.conditional_literal,
                                                  seq($.literal, ':', $._nlitvec)), choice(';', '|')),
                                       seq($.literal, ':', ';')),

      // yy
      disjunction: $ => choice(seq($._disjunctionsepelem,
                                   repeat($._disjunctionsepelem),
                                   $.optional_conditional_literal),
                               $.conditional_literal,
                               seq($.literal, ':', optional($._nlitvec))),

      /* rules */

      // yy as statement
      fact: $ => seq($._head, '.'),

      integrity_constraint: $ => prec(1, seq(':-', $._body, '.')),


      _head: $ => choice($.literal,
                        $._luheadaggregate,
                        $.disjunction),

      head: $ => $._head,

      // inlined
      _body_agg: $ => seq(optional($.default_negation),
                          optional($.default_negation),
                          $._lubodyaggregate),

      _body: $ => seq(repeat(choice(seq(choice($.literal, $._body_agg), choice(',', ';')),
                                    seq($._conjunction, ';'))),
                      choice($.literal, $._body_agg, $._conjunction)),

      body: $ => $._body,

      rule: $ => prec(1,seq(optional($.head), ':-', optional($.body), '.')),

      /* rules end */

      /* optimisation */

      _optimisation: $ => choice($.weak_constraint,
                                 $.optimise_statement),

      _optimise_list_elem: $ => seq($._ntermvec,
                                   optional(seq(':', optional(seq($.literal, repeat(seq(',', $.literal))))))),

      priority: $ => seq('@', $._single_term),

      weight: $ => $._single_term,

      optimise_weight: $ => seq($.weight, optional($.priority)),

      optimise_statement: $ => seq(
          choice('#maximize', '#minimize', '#maximise', '#minimise'),
          '{',
          optional(seq($.optimise_weight,
                       ',',
                       $._optimise_list_elem, repeat(seq(';', $._optimise_list_elem)))),
          '}', '.'),

      weak_constraint: $ => seq(':~', optional($.body), '.',
                                '[', $.optimise_weight, optional(seq(',', $._ntermvec)), ']'),

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
      show_statement: $ => seq(choice(seq('#show', optional(seq($._single_term, optional(seq(':', $.body))))),
                                      seq('#showsig', optional($.classical_negation), $.identifier, '/', $.number)),
                               '.'),
      // yy
      warning_statement: $ => seq('#defined', optional($.classical_negation), $.identifier, '/', $.number, '.'),

      // yy
      binaryargvec: $ => seq($._single_term, ',', $._single_term, repeat(seq(';', $._single_term, ',', $._single_term))),
      // yy
      edge_statement: $ => seq('#edge', '(', $.binaryargvec, ')', optional(seq(':', optional($.body))),  '.'),

      // yy
      heuristic_statement: $ => seq('#heuristic', $.atom, optional(seq(':', optional($.body))), '.',
                                    '[', $._single_term, optional(seq('@', $._single_term)), ',', $._single_term, ']'),

      // yy
      projection_statement: $ => seq('#project',
                                     choice(seq(optional($.classical_negation), $.identifier, '/', $.number, '.'),
                                            seq($.atom, optional(seq(':', optional($.body))),  '.'))),

      // yy, though term should really be restricted to be a constant term
      const_statement: $ => seq('#const', $.identifier, '=', $._single_term, '.',
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
                                   optional(seq('[', $._single_term, ']'))),

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
      _basic_theory_op: $ => choice('!', '<', '=', '>', '+', '-', '*', '/', '\\', '?', '&', '|', '~', '^'),

      _combination_only_theory_op: $ => choice('\.', ':', ';'),

      theory_op: $ => choice($.default_negation,
                            $._basic_theory_op,
                            seq(choice($._basic_theory_op, $._combination_only_theory_op),
                                repeat1(choice($._basic_theory_op, $._combination_only_theory_op)))),

      theory_op_list: $ => repeat1($.theory_op),

      theory_term: $ => choice(
          seq('{', $.theory_opterm_list, '}'),
          seq('[', $.theory_opterm_list, ']'),
          seq('(', ')'),
          seq('(', $.theory_opterm_list, ')'),
          seq('(', $.theory_opterm_list, ',', ')'),
          seq('(', $.theory_opterm_list, ',', $.theory_opterm_nlist, ')'),
          seq($.identifier, '(', $.theory_opterm_list, ')'),
          $.identifier,
          $.number,
          $.string,
          /"#inf(?:imum)?/,
          /#sup(?:remum)?/,
          $.variable),

      theory_opterm: $ => choice(
          seq($.theory_opterm, $.theory_opterm_list, $.theory_term),
          seq($.theory_op_list, $.theory_term),
          $.theory_term),

      theory_opterm_nlist: $ => choice(
          seq($.theory_opterm_nlist, ',', $.theory_opterm),
          $.theory_opterm),

      // WARNING: yy allows empty
      theory_opterm_list: $ => repeat1($.theory_opterm_nlist),



      theoryatom: $ => seq(),

      /* other */
  }
});
