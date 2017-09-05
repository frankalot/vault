package command

import (
	"strings"
	"testing"

	"github.com/mitchellh/cli"
)

func testRemountCommand(tb testing.TB) (*cli.MockUi, *RemountCommand) {
	tb.Helper()

	ui := cli.NewMockUi()
	return ui, &RemountCommand{
		BaseCommand: &BaseCommand{
			UI: ui,
		},
	}
}

func TestRemountCommand_Run(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		args []string
		out  string
		code int
	}{
		{
			"not_enough_args",
			nil,
			"Not enough arguments",
			1,
		},
		{
			"too_many_args",
			[]string{"foo", "bar", "baz"},
			"Too many arguments",
			1,
		},
		{
			"non_existent",
			[]string{"not_real", "over_here"},
			"Error remounting not_real/ to over_here/",
			2,
		},
	}

	t.Run("validations", func(t *testing.T) {
		t.Parallel()

		for _, tc := range cases {
			tc := tc

			t.Run(tc.name, func(t *testing.T) {
				t.Parallel()

				ui, cmd := testRemountCommand(t)

				code := cmd.Run(tc.args)
				if code != tc.code {
					t.Errorf("expected %d to be %d", code, tc.code)
				}

				combined := ui.OutputWriter.String() + ui.ErrorWriter.String()
				if !strings.Contains(combined, tc.out) {
					t.Errorf("expected %q to contain %q", combined, tc.out)
				}
			})
		}
	})

	t.Run("integration", func(t *testing.T) {
		t.Parallel()

		client, closer := testVaultServer(t)
		defer closer()

		ui, cmd := testRemountCommand(t)
		cmd.client = client

		code := cmd.Run([]string{
			"secret/", "generic/",
		})
		if exp := 0; code != exp {
			t.Errorf("expected %d to be %d", code, exp)
		}

		expected := "Success! Remounted secret/ to: generic/"
		combined := ui.OutputWriter.String() + ui.ErrorWriter.String()
		if !strings.Contains(combined, expected) {
			t.Errorf("expected %q to contain %q", combined, expected)
		}

		mounts, err := client.Sys().ListMounts()
		if err != nil {
			t.Fatal(err)
		}

		if _, ok := mounts["generic/"]; !ok {
			t.Errorf("expected mount at generic/: %#v", mounts)
		}
	})

	t.Run("communication_failure", func(t *testing.T) {
		t.Parallel()

		client, closer := testVaultServerBad(t)
		defer closer()

		ui, cmd := testRemountCommand(t)
		cmd.client = client

		code := cmd.Run([]string{
			"secret/", "generic/",
		})
		if exp := 2; code != exp {
			t.Errorf("expected %d to be %d", code, exp)
		}

		expected := "Error remounting secret/ to generic/: "
		combined := ui.OutputWriter.String() + ui.ErrorWriter.String()
		if !strings.Contains(combined, expected) {
			t.Errorf("expected %q to contain %q", combined, expected)
		}
	})

	t.Run("no_tabs", func(t *testing.T) {
		t.Parallel()

		_, cmd := testRemountCommand(t)
		assertNoTabs(t, cmd)
	})
}
