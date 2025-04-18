!macro preInit
  ; This macro is automatically called by NSIS before the installer is started
  SetRegView 64
  
  ; Prevent multiple installations running simultaneously
  System::Call 'kernel32::CreateMutexW(i 0, i 0, t "SamaroSyncInstallerMutex") i .r1 ?e'
  Pop $R0
  StrCmp $R0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "The installer is already running."
    Abort
!macroend

!macro customInit
  ; This macro is called by NSIS when the installer is initialized
  SetRegView 64
!macroend

!macro customInstall
  ; This macro is called by NSIS during installation
  SetRegView 64
  
  ; Define app info
  !define APP_NAME "Samaro Sync"
  !define APP_EXE "SamaroSync.exe"
  !define APP_BAT "SamaroSync.bat"
  !define APP_REGKEY "Software\Samaro\SamaroSync"
  
  ; Explicitly register the application in the Windows Registry
  WriteRegStr HKLM "${APP_REGKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${APP_REGKEY}" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "${APP_REGKEY}" "Version" "${VERSION}"
  WriteRegStr HKLM "${APP_REGKEY}" "Path" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKLM "${APP_REGKEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "${APP_REGKEY}" "Publisher" "Samaro Inc."
  
  ; Register in App Paths to help Windows find the executable
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXE}" "" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXE}" "Path" "$INSTDIR"
  
  ; For proper uninstallation experience
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayIcon" "$INSTDIR\${APP_EXE},0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString" "$INSTDIR\Uninstall ${APP_NAME}.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "Publisher" "Samaro Inc."
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "NoRepair" 1
  
  ; Create proper Start Menu shortcut with batch file
  CreateDirectory "$SMPROGRAMS\Samaro Inc"
  CreateShortCut "$SMPROGRAMS\Samaro Inc\${APP_NAME}.lnk" "$INSTDIR\${APP_BAT}" "" "$INSTDIR\${APP_EXE}" 0
  
  ; Create Desktop shortcut with batch file
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_BAT}" "" "$INSTDIR\${APP_EXE}" 0
  
  ; Additional shortcuts in Start Menu folder
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_BAT}" "" "$INSTDIR\${APP_EXE}" 0
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" "$INSTDIR\Uninstall ${APP_NAME}.exe"
  
  ; Create a file association shortcut too (as another option)
  WriteRegStr HKCR ".samarosync" "" "SamaroSync.Launcher"
  WriteRegStr HKCR "SamaroSync.Launcher" "" "Samaro Sync Launcher"
  WriteRegStr HKCR "SamaroSync.Launcher\DefaultIcon" "" "$INSTDIR\${APP_EXE},0"
  WriteRegStr HKCR "SamaroSync.Launcher\shell\open\command" "" '"$INSTDIR\${APP_BAT}"'
!macroend

!macro customUnInstall
  ; This macro is called by NSIS during uninstallation
  SetRegView 64
  
  ; Define app info
  !define APP_NAME "Samaro Sync"
  !define APP_EXE "SamaroSync.exe"
  !define APP_REGKEY "Software\Samaro\SamaroSync"
  
  ; Remove registry entries
  DeleteRegKey HKLM "${APP_REGKEY}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXE}"
  
  ; Remove shortcuts
  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\Samaro Inc\${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\Samaro Inc"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  
  ; Remove file associations if needed
  ; DeleteRegKey HKCR ".yourext"
  ; DeleteRegKey HKCR "SamaroSync.File"
!macroend 