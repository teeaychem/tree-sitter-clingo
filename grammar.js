module.exports = grammar({
  name: 'clingo',

    inline: $ => [
                  $._body_agg,
                  $.tuple,
                  $.unary_arithmetic_function,
                  $.binary_arithmetic_function,
                  $.argvec
                  ],

  rules: {

      source_file: $ =>
          repeat(choice($.rule,
                        $.fact,
                        $.integrity_constraint,
                        $.comment,
                        $._optimisation,
                        $._statement,
                        $._script)),


      // skip constterm from yy which excludes variables and pools
      // api yy mix
      term: $ => prec(2,choice('_',
                               $.function,
                               $.number,
                               $.string,
                               /#inf/,
                               /#sup/
                               $.variable,
                               $.arithmetic_function,
                               $.interval,
                               $.function,
                               $.pool,
                               $.external_function)),

      // yy i think this should be right, non-empty termvec --- i.e. if used also allow empty (wrap in optional)
      _ntermvec: $ => prec.right(seq($.term, optional(repeat(seq(',', $.term))))),

      // yy also allows optional
      argvec: $ => seq($._ntermvec, optional(repeat(seq(';', $._ntermvec)))),

      // api, enforced left
      interval: $ => prec.left(seq($.term, '..', $.term)),

      function: $ => choice(
          $.identifier,
          $._arg_function),

      _arg_function: $ => prec(1,seq($.identifier, '(', optional($.argvec), ')')),

      // yy also allows empty
      tuple: $ => choice($._ntermvec, seq($._ntermvec, ','), ','),

      // yy
      pool: $ => seq('(', optional(seq($.tuple, optional(repeat(seq(';', $.tuple))))), ')'),

      string: $ => seq('"', repeat(choice(/[^\"\n]/, /\\[\"n]/)), '"'),

      default_negation: $ => 'not',

      classical_negation: $ => '-',

      identifier: $ => /_*[a-z][A-Za-z0-9_\']*/, // includes defualt and override from the api

      variable: $ => /[_\']*[A-Z][\'A-Za-z0-9_]*/,

      number: $ => choice(/0|(?:[1-9][0-9]*)/, // decimal
                          /0x[0-9A-Fa-f]+/, // hexadecimal
                          /0o[1-7]+/, // octal
                          /0b[0-1]+/), // binary

      external_function: $ => seq('@', $.function), // python functions, etc.

      atom: $ => seq(optional($.classical_negation), $.function),

      // no explicit conditional literals as then ambiguous between literal and conditional literal.
      // instead, easy to check whether condition follows
      literal: $ => // api
          seq(optional($.default_negation),
              optional($.default_negation),
              choice($.boolean,
                     $.atom,
                     $.comparison)),

      // yy, use optional($.nlitvec) for litvec
      nlitvec: $ => seq($.literal, optional(repeat(seq(',', $.literal)))),

      boolean: $ => choice('#true', '#false'),

      // yy, inlines unaryargvec for abs case
      arithmetic_function: $ => choice($.unary_arithmetic_function,
                                       $.binary_arithmetic_function),

      unary_arithmetic_function: $ => prec(1, choice(seq(choice('-', '~'), $.term),
                                                      seq('|', seq($.term, optional(repeat(seq(';', $.term)))), '|'))),

      // yy
      binary_arithmetic_function: $ => choice(prec.left(2, seq($.term,
                                                               choice('^', '?', '&', '+', '-', '*', '/', '\\'),
                                                               $.term)),
                                              prec.right(2, seq($.term,
                                                                choice('**'),
                                                                $.term))),

      // yy
      _comparison_predicate: $ => choice('=', '!=', '<', '<=', '>', '>='),

      // term + rellitvec from the yy
      comparison: $ => prec(1,
          seq($.term,
              optional(repeat(seq($._comparison_predicate, $.term))),
              seq($._comparison_predicate, $.term))),

      condition: $ => seq(':', $.literal, optional(repeat(seq(',', $.literal)))),

      /* aggregates start */

      // not in yy, but pair to upper guard
      lower_guard: $ => seq($.term, optional($._comparison_predicate)),

      // upper in yy and optional, so should wrap here
      upper_guard: $ => seq(optional($._comparison_predicate), $.term),

      // yy
      aggregatefunction: $ => choice('#sum', '#sum+', '#min', '#max', '#count'),

      // yy
      _bodyaggrelem: $ => prec(1, choice(seq(':', optional($.nlitvec)),
                                        seq($._ntermvec, optional(seq(':', optional($.nlitvec)))))),

      // yy
      _bodyaggregate: $ => choice(seq('{', '}'),
                                 seq('{', seq($.literal, optional($.condition), optional(repeat(seq(';', $.literal, optional($.condition))))), '}'),
                                 seq($.aggregatefunction, '{', '}'),
                                 seq($.aggregatefunction, '{', seq($._bodyaggrelem, optional(repeat(seq(';', $._bodyaggrelem)))), '}')),

      // yy but MISSING theory_atom
      lubodyaggregate: $ => choice($._guarded__bodyaggregate_full,
                                   $._guarded__bodyaggregate_partial,
                                   $._bodyaggregate),

      _guarded__bodyaggregate_full: $ => prec(2, seq($.lower_guard, $._bodyaggregate, $.upper_guard)),

      _guarded__bodyaggregate_partial: $ => prec(1,choice(seq($.lower_guard, $._bodyaggregate),
                                                         seq($._bodyaggregate, $.upper_guard))),

      // yy
      _headaggrelemvec: $ => seq(optional($._ntermvec), ':', $.literal, optional($.condition), optional(repeat(seq(';', optional($._ntermvec), ':', $.literal, optional($.condition))))),

      // yy
      _altheadaggrelemvec: $ => seq($.literal, optional($.condition), optional(repeat(seq(';', $.literal, optional($.condition))))),

      // yy
      _headaggregate: $ => choice(seq('{', '}'),
                                 seq($.aggregatefunction, '{', '}'),
                                 seq($.aggregatefunction, '{', $._headaggrelemvec, '}'),
                                 seq('{', $._altheadaggrelemvec, '}')),

      // yy, MISSING theory_atom
      luheadaggregate: $ => choice($._guarded_headaggregate_full,
                                   $._guarded_headaggregate_partial,
                                   $._headaggregate,),

      _guarded_headaggregate_full: $ => prec(2, seq($.lower_guard, $._headaggregate, $.upper_guard)),

      _guarded_headaggregate_partial: $ => prec(1,choice(seq($.lower_guard, $._headaggregate),
                                                         seq($._headaggregate, $.upper_guard))),

      /* aggregates end */

      // yy
      conjunction: $ => seq($.literal, ':', optional($.nlitvec)),

      _disjunctionsepelem: $ => choice(seq($.literal, ','),
                                      seq($.literal, choice(';', '|')),
                                      seq($.literal, ':', $.nlitvec, choice(';', '|')),
                                      seq($.literal, ':', ';')),

      // yy
      disjunction: $ => choice(seq($._disjunctionsepelem, optional(repeat($._disjunctionsepelem)), $.literal, optional($.condition)),
                               seq($.literal, ':', optional($.nlitvec))),

      /* rules */

      // yy as statement
      fact: $ => seq($.head, $.dot),
      integrity_constraint: $ => seq(':-', $.body, $.dot),


      head: $ => choice($.literal,
                        $.luheadaggregate,
                        $.disjunction),

      _body_agg: $ => seq(optional($.default_negation), optional($.default_negation), $.lubodyaggregate),

      // body: $ => seq(choice(optional(repeat(seq($.literal, ',')))), $.literal),

      body: $ => seq(choice(optional(repeat(choice(seq(choice($.literal, $._body_agg), choice(',', ';')),
                                                   seq($.conjunction, ';'))))), choice($.literal, $._body_agg, $.conjunction)),

      rule: $ => prec(1,seq(optional($.head), ':-', optional($.body), $.dot)),

      /* rules end */

      /* optimisation */

      _optimisation: $ => choice($.weak_constraint,
                                $.optimise_statement),

      _optimise_list_elem: $ => seq($._ntermvec,
                                   optional(seq(':', optional(seq($.literal, optional(repeat(seq(',', $.literal)))))))),

      _optimise_weight: $ => field('weight', seq($.term, optional(seq('@', $.term)))),

      optimise_statement: $ => seq(
          choice('#maximize', '#minimize', '#maximise', '#minimise'),
          '{',
          optional(seq($._optimise_weight,
                       ',',
                       field('list', $._optimise_list_elem, optional(repeat(seq(';', $._optimise_list_elem)))))),
          '}', $.dot),

      weak_constraint: $ => seq(':~', optional($.body), $.dot, '[', $._optimise_weight, optional(seq(',', $._ntermvec)), ']'),

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
                               $.dot),
      // yy
      warning_statement: $ => seq('#defined', optional($.classical_negation), $.identifier, '/', $.number, $.dot),

      // yy
      binaryargvec: $ => seq($.term, ',', $.term, optional(repeat(seq(';', $.term, ',', $.term)))),
      // yy
      edge_statement: $ => seq('#edge', '(', $.binaryargvec, ')', optional(seq(':', optional($.body))),  $.dot),

      // yy
      heuristic_statement: $ => seq('#heuristic', $.atom, optional(seq(':', optional($.body))), $.dot,
                                    '[', $.term, optional(seq('@', $.term)), ',', $.term, ']'),

      // yy
      projection_statement: $ => seq('#project',
                                     choice(seq(optional($.classical_negation), $.identifier, '/', $.number, $.dot),
                                            seq($.atom, optional(seq(':', optional($.body))),  $.dot))),

      // yy, though term should really be restricted to be a constant term
      const_statement: $ => seq('#const', $.identifier, '=', $.term, $.dot, optional(seq('[', choice('default', 'override'), ']'))),

      // yy
      include_statement: $ => seq('#include', choice($.string, seq('<', $.identifier, '>')), $.dot),

      // yy
      block_statement: $ => seq('#program',
                                $.identifier,
                                optional(seq('(', optional(seq($.identifier, optional(repeat(seq(',', $.identifier))))), ')')),$.dot),

      // yy
      external_statement: $ => seq('#external', $.atom, optional(seq(':', optional($.body))), $.dot, optional(seq('[', $.term, ']'))),

      /* script stuff */
      // not yy, and currently incomplete

      _script: $ => choice(
          $.python,
          $.lua
      ),

      python: $ => seq('#script', '(python)',
          /(?:(?:[^#])|(?:#[^e])|(?:#e[^n])|(?:#en[^d])|(?:#end[^\.]))+/, '#end\.'),

      lua: $ => seq('#script', '(lua)',
          /(?:(?:[^#])|(?:#[^e])|(?:#e[^n])|(?:#en[^d])|(?:#end[^\.]))+/, '#end\.'),

      /* script stuff end */

      /* theories */
      theoryatom: $ => seq(),

      /* other */

      dot: $ => '.',
  }
});
