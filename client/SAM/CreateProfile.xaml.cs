using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Storage.Pickers.Provider;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// Die Elementvorlage "Inhaltsdialog" ist unter "http://go.microsoft.com/fwlink/?LinkID=390556" dokumentiert.

namespace SAM
{
    public sealed partial class CreateProfile : ContentDialog
    {
        public CreateProfile()
        {
            this.InitializeComponent();
        }

        private void ContentDialog_PrimaryButtonClick(ContentDialog sender, ContentDialogButtonClickEventArgs args)
        {
            //Create Profile
            var profiles = (App.Current as App)._consumptionProfiles;
            if((bool)_dieselCheckbox.IsChecked)
            {
                //todo check if key already set

                double m, n;
                if (mValue.Text != "")
                {
                    m = double.Parse(mValue.Text);
                }
                else
                {
                    m = 0.003;
                }
                if (nValue.Text != "")
                {
                    n = double.Parse(nValue.Text);
                }
                else
                {
                    n = 0.6958;
                }
                profiles[Name.Text] = new DieselConsumption(Name.Text, m, n);
            }
            else if((bool) _petrolCheckbox.IsChecked)
            {
                //todo implement!
            }
        }

        private void ContentDialog_SecondaryButtonClick(ContentDialog sender, ContentDialogButtonClickEventArgs args)
        {
            
        }
    }
}
