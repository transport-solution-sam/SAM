using SAM.Common;
using System;
using System.Text.RegularExpressions;
using Windows.Storage;
using Windows.UI.Popups;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Navigation;

// Die Elementvorlage "Standardseite" ist unter "http://go.microsoft.com/fwlink/?LinkID=390556" dokumentiert.

namespace SAM
{
    public sealed partial class AccountConfiguration : Page
    {
        private NavigationHelper navigationHelper;
        private ObservableDictionary defaultViewModel = new ObservableDictionary();

        public AccountConfiguration()
        {
            this.InitializeComponent();

            this.navigationHelper = new NavigationHelper(this);
            this.navigationHelper.LoadState += this.NavigationHelper_LoadState;
            this.navigationHelper.SaveState += this.NavigationHelper_SaveState;

            _configurationPanel.Visibility = Visibility.Collapsed;
            _createAccountPanel.Visibility = Visibility.Collapsed;
            _loginPanel.Visibility = Visibility.Collapsed;
      
            //adapt appearrance of menu depending on login
            if ((App.Current as App)._loggedIn)
            {
                _configurationPanel.Visibility = Visibility.Visible;
                _accountMailPanel.Text = ApplicationData.Current.LocalSettings.Values["userMail"].ToString();
            }
            else if(ApplicationData.Current.LocalSettings.Values.ContainsKey("userMail"))
            {              
                _userMailBox.Text = ApplicationData.Current.LocalSettings.Values["userMail"].ToString();
                _loginPanel.Visibility = Visibility.Visible;
            }
            else { _loginPanel.Visibility = Visibility.Visible; }
                    
        }


        //navigation handler---------------------------------------------------------------

        public NavigationHelper NavigationHelper
        {
            get { return this.navigationHelper; }
        }

        public ObservableDictionary DefaultViewModel
        {
            get { return this.defaultViewModel; }
        }

        private void NavigationHelper_LoadState(object sender, LoadStateEventArgs e)
        {
        }

        private void NavigationHelper_SaveState(object sender, SaveStateEventArgs e)
        {
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            this.navigationHelper.OnNavigatedTo(e);
        }

        protected override void OnNavigatedFrom(NavigationEventArgs e)
        {
            this.navigationHelper.OnNavigatedFrom(e);
        }

        
        //generic dialogs---------------------------------------------------------------
       
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

        
        //Button Click---------------------------------------------------------------

        // activate GUI elements for account creation
        private void _createAccountButton_Click(object sender, RoutedEventArgs e)
        {
            _loginPanel.Visibility = Visibility.Collapsed;
            _createAccountPanel.Visibility = Visibility.Visible;
        }

        // performs login to SAM server
        private async void _loginButton_Click(object sender, RoutedEventArgs e)
        {
            //Verify Mail-Adress
            String mail = _userMailBox.Text;
            Match mailValidation = new Regex(@"^([\w\.\-]+)@([\w\-]+)((\.(\w){2,3})+)$").Match(mail);
            if (!mailValidation.Success)
            {
                ShowGenericOkDialog("Bitte gültige E-Mail Adresse eingeben");
                return;
             }


            try
            {
                string password = _passwordTextBox.Password;
                (App.Current as App).Server = new ServerCommunication(mail, password);
                SamServerResponse response = await (App.Current as App).Server.Signin();
                if (response.successfull)
                {
                    ApplicationData.Current.LocalSettings.Values["password"] = password;
                    ApplicationData.Current.LocalSettings.Values["userMail"] = mail;
                    _loginPanel.Visibility = Visibility.Collapsed;

                    Frame.Navigate(typeof(StartPage));
                    (App.Current as App)._loggedIn = true;
                }
                else
                {
                    (App.Current as App)._loggedIn = false;
                    ShowGenericOkDialog(response.ErrorMessage);
                }
            }
            catch (Exception)
            {
                ShowGenericOkDialog("Es ist ein unbekannter Fehler beim Login augetreten!");
                (App.Current as App)._loggedIn = false;
            }
        }

        //creates a new user-account
        private async void _createButton_Click(object sender, RoutedEventArgs e)
        {
            String mail = _createUserMailBox.Text;
            Match mailValidation = new Regex(@"^([\w\.\-]+)@([\w\-]+)((\.(\w){2,3})+)$").Match(mail);
            if (!mailValidation.Success)
            {
                var emailErrorDialog = new MessageDialog("Bitte gültige E-Mail Adresse eingeben");
                emailErrorDialog.Commands.Add(new UICommand("ok"));
                await emailErrorDialog.ShowAsync();
                return;
            }

            if (_createPasswordTextBox.Password != _passwordVerifyBox.Password)
            {
                ShowGenericOkDialog("Passwörter müssen übereinstimmen");
                return;
            }

            _createButton.Content = "Erstelle Account...";
            _createButton.IsEnabled = false;

            (App.Current as App).Server = new ServerCommunication(_createUserMailBox.Text, _createPasswordTextBox.Password);
            SamServerResponse response = await(App.Current as App).Server.Signup();
            if(response.successfull)
            {
                ApplicationData.Current.LocalSettings.Values["userMail"] = mail;
                ApplicationData.Current.LocalSettings.Values["password"] = _passwordTextBox.Password;
                (App.Current as App)._loggedIn = true;
                var successDialog = new MessageDialog("Account wurde erfolgreich erstellt. Sie sind jetzt eingeloggt!");
                successDialog.Commands.Add(new UICommand("ok"));
                await successDialog.ShowAsync();
                _createButton.IsEnabled = true;
                _createAccountPanel.Visibility = Visibility.Collapsed;
                _configurationPanel.Visibility = Visibility.Visible;
                Frame.Navigate(typeof(StartPage));
            }
            else
            {
                ShowGenericOkDialog(response.ErrorMessage);
                _createButton.IsEnabled = true;
                _createButton.Content = "Neuen Account Erstellen";
            }
        }

        //changes user-name of active-account
        private async void _changeUsernameButton_Click(object sender, RoutedEventArgs e)
        {
            _newPassword.Visibility = Visibility.Collapsed;
            _newPassword2.Visibility = Visibility.Collapsed;
            if (_newUsernameBox.Visibility == Visibility.Collapsed)
            {
                _newUsernameBox.Visibility = Visibility.Visible;
            }
            else
            {
                String mail = _newUsernameBox.Text;
                if (mail == "")
                {
                    _newUsernameBox.Visibility = Visibility.Collapsed;
                    return;
                }
                else
                {
                    Match mailValidation = new Regex(@"^([\w\.\-]+)@([\w\-]+)((\.(\w){2,3})+)$").Match(mail);
                    if (!mailValidation.Success)
                    {
                        ShowGenericOkDialog("Bitte gültige E-Mail Adresse eingeben");
                        return;
                    }

                    //change request
                    try
                    {
                        SamServerResponse response = await (App.Current as App).Server.ChangeUsername(mail);
                        if (response.successfull)
                        {
                            String password = ApplicationData.Current.LocalSettings.Values["password"].ToString();
                            (App.Current as App).Server = new ServerCommunication(mail, password);
                            SamServerResponse signinResponse = await (App.Current as App).Server.Signin();
                            if (signinResponse.successfull)
                            {
                                ApplicationData.Current.LocalSettings.Values["userMail"] = mail;
                                ShowGenericOkDialog("Der Nutzername wurde erfolgreich geändert. Sie sind jetzt mit dem neuen Nutzernamen eingeloggt.");
                                _newUsernameBox.Visibility = Visibility.Collapsed;
                                _accountMailPanel.Text = ApplicationData.Current.LocalSettings.Values["userMail"].ToString();
                            }
                            else
                            {
                                ShowGenericOkDialog(signinResponse.ErrorMessage);
                            }
                        }
                    }
                    catch (Exception)
                    {
                        ShowGenericOkDialog("Ein unbekannter Fehler ist aufgetreten");
                    }
                }
            }
                    
                                  
           
        }

        //deletes active user-account
        private async void _deleteAccountButton_Click(object sender, RoutedEventArgs e)
        {
            var emailErrorDialog = new MessageDialog("Wollen Sie Ihren Account wirklich vom Server löschen?");
            emailErrorDialog.Commands.Add(new UICommand("Ja", new UICommandInvokedHandler(delete_account)));
            emailErrorDialog.Commands.Add(new UICommand("Nein"));
            await emailErrorDialog.ShowAsync();
            return;
        }

        //changes password of active user-account
        private async void _changePasswordButton_Click(object sender, RoutedEventArgs e)
        {
            _newUsernameBox.Visibility = Visibility.Collapsed;
            if (_newPassword.Visibility == Visibility.Collapsed)
            {
                //show input dialogs
                _newPassword.Password = "";
                _newPassword2.Password = "";
                _newPassword.Visibility = Visibility.Visible;
                _newPassword2.Visibility = Visibility.Visible;
            }
            else
            {
                if (_newPassword2.Password != _newPassword.Password)
                {
                    var emailErrorDialog = new MessageDialog("Passwörter müssen übereinstimmen");
                    emailErrorDialog.Commands.Add(new UICommand("ok"));
                    await emailErrorDialog.ShowAsync();
                    return;
                }
                else if (_newPassword.Password == "")
                {
                    _newPassword.Visibility = Visibility.Collapsed;
                    _newPassword2.Visibility = Visibility.Collapsed;
                    return;
                }
                //change password
                String password = _newPassword.Password;
                SamServerResponse changeResponse = await (App.Current as App).Server.ChangePassword(password);
                if(changeResponse.successfull)
                {
                    String mail = ApplicationData.Current.LocalSettings.Values["userMail"].ToString();
                    (App.Current as App).Server = new ServerCommunication(mail, password);
                    SamServerResponse signinResponse = await (App.Current as App).Server.Signin();
                    if (signinResponse.successfull)
                    {
                        ApplicationData.Current.LocalSettings.Values["password"] = password;
                        ShowGenericOkDialog("Das Passwort wurde erfolgreich geändert. Sie sind jetzt mit dem neuen Passwort eingeloggt.");
                    }
                    else ShowGenericOkDialog(signinResponse.ErrorMessage);

                }
                else ShowGenericOkDialog(changeResponse.ErrorMessage);

                _newPassword.Visibility = Visibility.Collapsed;
                _newPassword2.Visibility = Visibility.Collapsed;
            }
        }

        //performs logout od current user-account
        private async void _logoutButton_Click(object sender, RoutedEventArgs e)
        {
            //signout
            await (App.Current as App).Server.Signout();
            (App.Current as App)._loggedIn = false;
            ApplicationData.Current.LocalSettings.Values.Remove("password");
            _configurationPanel.Visibility = Visibility.Collapsed;
            _loginPanel.Visibility = Visibility.Visible;
            Frame.Navigate(typeof(MainPage));
        }

        
        // private methods---------------------------------------------------------------------------
        private async void delete_account(IUICommand label)
        {
            SamServerResponse response = await (App.Current as App).Server.DeleteUser();
            if (response.successfull)
            {
                var Dialog = new MessageDialog("Ihr Account wurde erfolgreich gelöscht. Sie sind jetzt abgemeldet!");
                Dialog.Commands.Add(new UICommand("OK", new UICommandInvokedHandler(delete_account)));
                await Dialog.ShowAsync();
                ApplicationData.Current.LocalSettings.Values.Remove("userMail");
                ApplicationData.Current.LocalSettings.Values.Remove("password");
                _configurationPanel.Visibility = Visibility.Collapsed;
                _loginPanel.Visibility = Visibility.Visible;
            }
            else
            {
                ShowGenericOkDialog(response.ErrorMessage);
            }
        }
    }
}
