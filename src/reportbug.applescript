on run argv
	set theSubject to item 1 of argv
	set theBody to item 2 of argv
	
	tell application "Mail"
		set newMessage to make new outgoing message with properties {subject:theSubject, content:theBody}
		tell newMessage
			set visible to true
			make new to recipient at end of to recipients with properties {name:"June Tate", address:"june@theonelab.com"}
		end tell
		
		activate
	end tell
end run
