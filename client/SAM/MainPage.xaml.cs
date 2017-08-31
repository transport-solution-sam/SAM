using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Storage;
using Windows.UI.Popups;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;


namespace SAM
{

    public sealed partial class MainPage : Page
    {

        public MainPage()
        {

            this.InitializeComponent();
            this.NavigationCacheMode = NavigationCacheMode.Required;

            (App.Current as App)._loggedIn = false;

            
            //check if user was logged in before
            if (ApplicationData.Current.LocalSettings.Values.ContainsKey("userMail"))
            {
                _accountSettingButton.IsEnabled = false;
                _accountSettingButton.Content = "Anmeldung läuft...";
                login();
                
            }

            
            System.Diagnostics.Debug.WriteLine($"App started");
            
            //perfom  OBD-Login      
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {}

        //Simple Message-Dialog (Input is message)
        private async void ShowGenericOkDialog(String message)
        {
            var dialog = new MessageDialog(message);
            dialog.Commands.Add(new UICommand("ok"));
            await dialog.ShowAsync();
        }

        //Message-Dialog for Error-Code 1 (Connection or Json Error)
        private async void ShowGenericConnectionErrorDialog()
        {
            var dialog = new MessageDialog("Verbindungsfehler: Keine Internetverbindung oder unbekanntes Dateneingangsformat");
            dialog.Commands.Add(new UICommand("ok"));
            await dialog.ShowAsync();
        }

        //performs login and navigates to startpage if successfull
        private async void login()
        {
            string userMail = ApplicationData.Current.LocalSettings.Values["userMail"].ToString();
            if (ApplicationData.Current.LocalSettings.Values.ContainsKey("password"))
            {
                string password = ApplicationData.Current.LocalSettings.Values["password"].ToString();
                (App.Current as App).Server = new ServerCommunication(userMail, password);
                try
                {
                    SamServerResponse response = await (App.Current as App).Server.Signin();
                    if (response.successfull)
                    {
                        (App.Current as App)._loggedIn = true;
                        _accountSettingButton.Content = "Anmeldung verwalten";
                        _accountSettingButton.IsEnabled = true;
                        Frame.Navigate(typeof(StartPage));
                    }
                    else
                    {
                        ShowGenericOkDialog(response.ErrorMessage);
                        Frame.Navigate(typeof(AccountConfiguration));
                    }
                }
                catch(Exception)
                {
                    ShowGenericOkDialog("Ein unbekannter Fehler ist aufgetreten.");
                }
            } 
        }

        private void _accountSettingButton_Click(object sender, RoutedEventArgs e)
        {
            Frame.Navigate(typeof(AccountConfiguration));
        }

        private void _toTrackingButton_Click(object sender, RoutedEventArgs e)
        {
            Frame.Navigate(typeof(StartPage));
        }

        private void _toConsumptionButton_Click(object sender, RoutedEventArgs e)
        {
            Frame.Navigate(typeof(consumptionConfiguration));
        }
    }
}
