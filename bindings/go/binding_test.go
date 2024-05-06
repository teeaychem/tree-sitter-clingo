package tree_sitter_clingo_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-clingo"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_clingo.Language())
	if language == nil {
		t.Errorf("Error loading Clingo grammar")
	}
}
